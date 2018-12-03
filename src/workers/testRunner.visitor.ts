import { TestsVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { Test } from 'testyts/build/lib/tests/test';
import { TestSuite } from 'testyts/build/lib/tests/testSuite';
import { TestStatus } from 'testyts/build/lib/testStatus';
import { TestEvent } from 'vscode-test-adapter-api';

export class TestRunnerVisitor implements TestsVisitor<void>{
    private testSuites: TestSuite[] = [];

    constructor(private testsToRun: string[]) { }

    public async visitTestSuite(tests: TestSuite): Promise<void> {
        this.testSuites.push(tests);
        const currentId = this.testSuites.map(x => this.encodeName(x.name)).join('.');
        if (!this.shouldRun(currentId)) {
            this.testSuites.pop();
            return;
        }

        console.log(currentId.split('.').map(x => this.decodeName(x)).join('.'));

        try {
            await this.runAll(tests.beforeAllMethods, tests.context);
            await this.runTests(tests);
            await this.runAll(tests.afterAllMethods, tests.context);
        }
        catch (err) { }
        finally {
            this.testSuites.pop();
        }
    }

    private shouldRun(current: string) {
        const currentSplittedId = current.split('.');
        const currentDepth = currentSplittedId.length;

        for (const testId of this.testsToRun) {
            const splittedId = testId.split('.');
            const idDepth = splittedId.length;
            const minDepth = Math.min(currentDepth, idDepth);

            let matches = true;
            for (let i = 0; i < minDepth; ++i) {
                if (currentSplittedId[i] !== splittedId[i]) {
                    matches = false;
                }
            }

            if (matches) return true;
        }

        return false;
    }

    public async visitTest(test: Test): Promise<void> {
        const currentId = this.testSuites.map(x => this.encodeName(x.name)).join('.') + '.' + this.encodeName(test.name);
        if (!this.shouldRun(currentId)) { return; }

        if (test.status === TestStatus.Ignored) {
            process.send(<TestEvent>{ type: 'test', state: 'skipped', test: currentId })
            return;
        }

        console.log(currentId.split('.').map(x => this.decodeName(x)).join('.'));

        process.send(<TestEvent>{ type: 'test', state: 'running', test: currentId })

        try {
            const context = this.getClosestContext();
            await this.runBeforeEachMethods();
            await test.run(context);
            await this.runAfterEachMethods();
        }
        catch (err) {
            process.send(<TestEvent>{ type: 'test', state: 'failed', test: currentId })
            return;
        }

        process.send(<TestEvent>{ type: 'test', state: 'passed', test: currentId })
    }

    private async runTests(tests: TestSuite): Promise<void> {
        for (const id of tests.testIds) {
            const testReport = await tests.get(id).accept(this);
        }
    }

    private async runAll(methods, context: any) {
        for (const method of methods) {
            await method.bind(context)();
        }
    }

    private async runBeforeEachMethods() {
        for (const testSuite of this.testSuites) {
            await this.runAll(testSuite.beforeEachMethods, testSuite.context);
        }
    }

    private async runAfterEachMethods() {
        for (const testSuite of this.testSuites) {
            await this.runAll(testSuite.afterEachMethods, testSuite.context);
        }
    }

    private getClosestContext() {
        for (let i = this.testSuites.length - 1; i >= 0; --i) {
            const context = this.testSuites[i].context;
            if (context !== undefined) return context;
        }
    }

    private encodeName(name: string) {
        return Buffer.from(name).toString('base64');
    }

    private decodeName(encodedName: string) {
        return Buffer.from(encodedName, 'base64').toString('utf8');
    }
}

