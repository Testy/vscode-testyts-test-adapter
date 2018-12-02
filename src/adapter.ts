import { fork } from 'child_process';
import * as vscode from 'vscode';
import { TestAdapter, TestEvent, TestLoadFinishedEvent, TestLoadStartedEvent, TestRunFinishedEvent, TestRunStartedEvent, TestSuiteEvent } from 'vscode-test-adapter-api';
import { Log, detectNodePath } from 'vscode-test-adapter-util';
import { runFakeTests } from './fakeTests';
import { Config } from './models/models';

export class TestyTsAdapter implements TestAdapter {

    private disposables: { dispose(): void }[] = [];
    private readonly testsEmitter = new vscode.EventEmitter<TestLoadStartedEvent | TestLoadFinishedEvent>();
    private readonly testStatesEmitter = new vscode.EventEmitter<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent>();
    private readonly autorunEmitter = new vscode.EventEmitter<void>();

    get tests(): vscode.Event<TestLoadStartedEvent | TestLoadFinishedEvent> { return this.testsEmitter.event; }
    get testStates(): vscode.Event<TestRunStartedEvent | TestRunFinishedEvent | TestSuiteEvent | TestEvent> { return this.testStatesEmitter.event; }
    get autorun(): vscode.Event<void> | undefined { return this.autorunEmitter.event; }

    private config: Config;

    constructor(
        public readonly workspace: vscode.WorkspaceFolder,
        private readonly log: Log
    ) {
        this.log.info('Initializing testyTsAdapter adapter');

        this.disposables.push(this.testsEmitter);
        this.disposables.push(this.testStatesEmitter);
        this.disposables.push(this.autorunEmitter);

        this.disposables.push(vscode.workspace.onDidChangeConfiguration(async () => {
            this.config = await this.loadConfig();
        }));
    }

    async load(): Promise<void> {
        if (!this.config) {
            this.config = await this.loadConfig();
        }

        this.log.info('Loading example tests');


        fork(require.resolve('./workers/testLoaderWorker.js'), [],
            { cwd: this.workspace.uri.fsPath, execPath: this.config.nodePath, execArgv: [] })
            .on('message', response => {
                if (response instanceof String) {
                    console.log(response);
                    throw response;
                }
                else {
                    this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: response });
                }
            })
            .on('error', error => {
                throw error;
            });

        this.testsEmitter.fire(<TestLoadStartedEvent>{ type: 'started' });
    }

    async run(tests: string[]): Promise<void> {

        this.log.info(`Running example tests ${JSON.stringify(tests)}`);

        this.testStatesEmitter.fire(<TestRunStartedEvent>{ type: 'started', tests });

        this.testStatesEmitter.fire(<TestEvent>{ type: 'test', state: 'passed', test: tests[0] });

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

    private async loadConfig(): Promise<Config> {
        const config = vscode.workspace.getConfiguration('testyTsExplorer', this.workspace.uri);

        const adapterConfig: Config = {};
        adapterConfig.nodePath = config.get('nodePath') || await detectNodePath();

        return adapterConfig;
    }
}
