import { TestsVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { TestyTestInfo, TestyTestSuiteInfo, TestyTestRootInfo } from '../models/models';
import { Test } from 'testyts/build/lib/tests/test';
import { TestStatus } from 'testyts/build/lib/testStatus';
import { TestSuite } from 'testyts/build/lib/tests/testSuite';

export class TestConverterVisitor implements TestsVisitor<TestyTestInfo | TestyTestSuiteInfo> {
    private nameStack: string[] = [];

    public async visitTest(test: Test): Promise<TestyTestInfo | TestyTestSuiteInfo> {
        this.nameStack.push(this.encodeName(test.name));
        const info = new TestyTestInfo(this.nameStack.join('.'), test.name, test.status === TestStatus.Ignored);
        this.nameStack.pop();
        return info;
    }

    public async visitTestSuite(testSuite: TestSuite): Promise<TestyTestInfo | TestyTestSuiteInfo> {
        this.nameStack.push(this.encodeName(testSuite.name));
        const testInfo = testSuite.name === 'Root'
            ? new TestyTestRootInfo()
            : new TestyTestSuiteInfo(this.nameStack.join('.'), testSuite.name);

        for (const id of testSuite.testIds) {
            testInfo.children.push(await testSuite.get(id).accept(this));
        }

        this.nameStack.pop();
        return testInfo;
    }

    private encodeName(name: string) {
        return Buffer.from(name).toString('base64');
    }
}
