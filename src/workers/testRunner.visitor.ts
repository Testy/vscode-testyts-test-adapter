import { TestsVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { Test } from 'testyts/build/lib/tests/test';
import { TestSuite } from 'testyts/build/lib/tests/testSuite';
import { TestStatus } from 'testyts/build/lib/testStatus';
import { TestEvent, TestSuiteEvent } from 'vscode-test-adapter-api';

export class TestRunnerVisitor implements TestsVisitor<void>{
    private testSuites: TestSuite[] = [];

    constructor(private testsToRun: string[]) { }

    public async visitTestSuite(tests: TestSuite): Promise<void> {
        this.testSuites.push(tests);

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

    public async visitTest(test: Test): Promise<void> {
        const currentId = this.testSuites.map(x => this.encodeName(x.name)).join('.') + '.' + this.encodeName(test.name);
        if (!this.shouldRun(currentId)) { return; }

        if (test.status === TestStatus.Ignored) {
            process.send(<TestEvent>{ type: 'test', state: 'skipped', test: currentId })
            return;
        }

        process.send(<TestEvent>{ type: 'test', state: 'running', test: currentId })

        try {
            const context = this.getClosestContext();
            await this.runBeforeEachMethods();
            await test.run(context);
            await this.runAfterEachMethods();
        }
        catch (err) {
            process.send(<TestEvent>{ type: 'test', state: 'failed', test: currentId, message: JSON.stringify(err) })
            return;
        }

        process.send(<TestEvent>{ type: 'test', state: 'passed', test: currentId })
    }

    private async runTests(tests: TestSuite): Promise<void> {
        for (const id of tests.testIds) {
            await tests.get(id).accept(this);
        }
    }

    private shouldRun(current: string) {
        return this.testsToRun.find(x => x === current) !== undefined;
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

