import { resolve } from 'path';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { TestyTestRootInfo, TestyTestSuiteInfo, TestyTestInfo } from '../models/models';
import { TestSuite } from 'testyts/build/lib/tests/testSuite';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { TestsVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { Test } from 'testyts/build/lib/tests/test';
import { TestStatus } from 'testyts/build/lib/testStatus';

try {
    load()
        .then(testSuites => process.send(testSuites))
        .catch(err => process.send(err.message));
}
catch (err) {
    process.send(err.message);
}

async function load(): Promise<TestSuiteInfo> {
    const testLoader = new TestsLoader();
    const tsconfig = require(resolve(process.cwd(), 'tsconfig.json'));
    const testyConfig: TestyConfig = require(resolve(process.cwd(), 'testy.json'));

    const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsconfig);
    return tests.accept(new TestsAdapterVisitor()) as any;
}

class TestsAdapterVisitor implements TestsVisitor<TestyTestInfo | TestyTestSuiteInfo> {
    private nameStack: string[] = [];

    public async visitTest(test: Test): Promise<TestyTestInfo | TestyTestSuiteInfo> {
        this.nameStack.push(this.encodeName(test.name));
        return new TestyTestInfo(this.nameStack.join('.'), test.name, test.status === TestStatus.Ignored);
    }

    public async visitTestSuite(testSuite: TestSuite): Promise<TestyTestInfo | TestyTestSuiteInfo> {
        this.nameStack.push(this.encodeName(testSuite.name));
        const testInfo = testSuite.name === 'Root'
            ? new TestyTestRootInfo()
            : new TestyTestSuiteInfo(this.nameStack.join('.'), testSuite.name);

        for (const id of testSuite.testIds) {
            testInfo.children.push(await testSuite.get(id).accept(this));
        }

        return testInfo;
    }

    private encodeName(name: string) {
        return Buffer.from(name).toString('base64');
    }

    // private decodeName(encodedName: string) {
    //     return Buffer.from(encodedName, 'base64').toString('utf8');
    // }
}
