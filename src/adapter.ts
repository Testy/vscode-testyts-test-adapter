import * as vscode from 'vscode';
import { TestAdapter, TestLoadStartedEvent, TestLoadFinishedEvent, TestRunStartedEvent, TestRunFinishedEvent, TestSuiteEvent, TestEvent } from 'vscode-test-adapter-api';
import { Log } from 'vscode-test-adapter-util';
import { runFakeTests } from './fakeTests';
import { TestLoader } from './testLoader';

export class TestyTsAdapter implements TestAdapter {

    private disposables: { dispose(): void }[] = [];

    private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
    private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
    private readonly autorunEmitter = new vscode.EventEmitter<void>();

    get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
    get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
    get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

    constructor(
        public readonly workspace: vscode.WorkspaceFolder,
        private testLoader: TestLoader,
        private readonly log: Log
    ) {
        this.log.info('Initializing testyTsAdapter adapter');

        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.autorunEmitter);
    }

    async load(): Promise<void> {

        this.log.info('Loading example tests');

        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });

        try {
            const loadedTests = await this.testLoader.load();
            this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: loadedTests });
        }
        catch (err) {
            console.log(err);
        }
    }

    async run(tests: string[]): Promise<void> {

        this.log.info(`Running example tests ${JSON.stringify(tests)}`);

        this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

        // in a "real" TestAdapter this would start a test run in a child process
        await runFakeTests(tests, this.testStatesEmitter);

        this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });

    }

    async debug(tests: string[]): Promise<void> {
        // in a "real" TestAdapter this would start a test run in a child process and attach the debugger to it
        this.log.warn('debug() not implemented yet');
        throw new Error("Method not implemented.");
    }

    cancel(): void {
        // in a "real" TestAdapter this would kill the child process for the current test run (if there is any)
        throw new Error("Method not implemented.");
    }

    dispose(): void {
        this.cancel();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}
