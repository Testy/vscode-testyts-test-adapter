import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { resolve } from 'path';
import { WorkspaceFolder } from 'vscode';

export class TestLoader {
    constructor(private workspace: WorkspaceFolder) { }

    public async load(): Promise<TestSuiteInfo> {
        const cwd = process.cwd();
        process.chdir(this.workspace.uri.fsPath);
        console.log(process.cwd());
        const testLoader = new TestsLoader();
        const tsconfig = require(resolve(this.workspace.uri.fsPath, 'tsconfig.json'));
        tsconfig.compilerOptions.rootDir = this.workspace.uri.fsPath;
        const testyConfig: TestyConfig = require(resolve(this.workspace.uri.fsPath, 'testy.json'));

        const tests = await testLoader.loadTests(this.workspace.uri.fsPath, testyConfig.include, tsconfig);

        process.chdir(cwd);

        const rootTestSuite: TestSuiteInfo = {
            type: 'suite',
            id: 'root',
            label: 'TestyTs',
            children: []
        };

        if (!tests) {
            return rootTestSuite;
        }

        for (const testSuite of tests) {
            const testSuiteInfo: TestSuiteInfo = {
                type: 'suite',
                id: testSuite.name,
                label: testSuite.name,
                children: this.getTests(testSuite.tests, testSuite.name)
            };

            rootTestSuite.children.push(testSuiteInfo);
        }

        return rootTestSuite;
    }

    private getTests(tests: {}, prefix: string) {
        const children = [];

        for (const testId in tests) {
            const test = tests[testId];
            const hasTestcases = !(test instanceof Function);

            if (hasTestcases) {
                const id = `${prefix}${testId}`;
                children.push({
                    id: id,
                    label: testId,
                    type: 'nested',
                    children: this.getTests(test, id)
                });
            }
            else {
                children.push({
                    id: testId,
                    label: testId,
                    type: 'test',
                    test: test
                });
            }
        }

        return children;
    }
}