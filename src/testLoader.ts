import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { TestyTestInfo, TestyTestRootInfo, TestyTestSuiteInfo } from './models/models';
import { resolve } from 'path';
import { TestSuite } from 'testyts/build/lib/testSuite';

export class TestLoader {
    constructor() { }

    public async load(): Promise<TestSuiteInfo> {
        const testLoader = new TestsLoader();
        const tsconfig = require(resolve(process.cwd(), 'tsconfig.json'));
        const testyConfig: TestyConfig = require(resolve(process.cwd(), 'testy.json'));

        const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsconfig);
        const testsInfo = this.transformToTestsToTestsInfo(tests);
        return testsInfo;
    }

    private transformToTestsToTestsInfo(tests: TestSuite<any>[]) {
        if (!tests) {
            return new TestyTestRootInfo([]);
        }

        const rootTestSuite = new TestyTestRootInfo();
        for (const testSuite of tests) {
            const children = this.getTests(testSuite.tests, testSuite.name);
            const testSuiteInfo = new TestyTestSuiteInfo(testSuite.name, testSuite.name, children);
            rootTestSuite.children.push(testSuiteInfo);
        }

        return rootTestSuite;
    }

    private getTests(tests: {}, prefix: string) {
        const children = [];

        for (const testId in tests) {
            const test = tests[testId];
            const hasTestcases = !(test instanceof Function);

            const id = `${prefix}.${testId}`;
            if (hasTestcases) {
                const testCases = this.getTests(test, id);
                children.push(new TestyTestSuiteInfo(id, testId, testCases));
            }
            else {
                children.push(new TestyTestInfo(id, testId, false));
            }
        }

        return children;
    }
}