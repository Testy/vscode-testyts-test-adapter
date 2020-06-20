import { fork, ChildProcess, exec } from 'child_process';
import * as vscode from 'vscode';
import { TestAdapter, TestEvent, TestLoadFinishedEvent, TestLoadStartedEvent, TestRunFinishedEvent, TestRunStartedEvent, TestSuiteEvent, TestSuiteInfo } from 'vscode-test-adapter-api';
import { Log, detectNodePath } from 'vscode-test-adapter-util';
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
    private testRunnerProcess: ChildProcess;

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

        fork(require.resolve('./workers/testLoader.worker.js'), [],
            { cwd: this.workspace.uri.fsPath, execPath: this.config.nodePath, execArgv: [] })
            .on('message', (response: TestSuiteInfo) => {
                if (response instanceof String || typeof response === "string") {
                    vscode.window.showErrorMessage(response.toString());
                    console.log(response);
                    this.testsEmitter.fire(<TestLoadFinishedEvent>{ type: 'finished', suite: null });
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

    async run(tests: string[], execArgv: string[] = []): Promise<void> {
        if (!this.config) {
            throw new Error('Config is null.');
        }

        this.log.info(`Running example tests ${JSON.stringify(tests)}`);

        this.testRunnerProcess = fork(
            require.resolve('./workers/testRunner.worker.js'),
            [JSON.stringify(tests)],
            {
                cwd: this.workspace.uri.fsPath,
                execPath: this.config.nodePath,
                execArgv: execArgv
            })
            .on('message', (response: TestEvent | TestRunFinishedEvent) => {
                if (response instanceof String) {
                    console.log(response);
                }
                else {
                    this.testStatesEmitter.fire(response);
                }
            })
            .on('error', error => {
                this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
                throw error;
            })
            .on('exit', number => {
                this.log.info(`Test run finished with code ${number}`);
                this.testStatesEmitter.fire(<TestRunFinishedEvent>{ type: 'finished' });
                this.testRunnerProcess = undefined;
            });
    }

    async debug(testsToRun: string[]) {
        if (!this.config || (testsToRun.length === 0)) {
            return;
        }

        if (this.log.enabled) this.log.info(`Debugging test(s) ${JSON.stringify(testsToRun)} of ${this.workspace.uri.fsPath}`);

        let currentSession: vscode.DebugSession | undefined;

        this.run(testsToRun, [`--inspect-brk=${this.config.debuggerPort}`]);
        if (!this.testRunnerProcess) {
            this.log.error('Starting the worker failed');
            return;
        }

        try {
            this.log.info('Starting the debug session');
            await vscode.debug.startDebugging(this.workspace, {
                name: 'Debug TestyTs Tests',
                type: 'node',
                request: 'attach',
                port: this.config.debuggerPort,
                sourceMaps: true,
                protocol: 'inspector',
                timeout: 30000,
                stopOnEntry: false,
            });
        }
        catch (err) {
            console.log(err);
            throw err;
        }

        if (!vscode.debug.activeDebugSession) {
            this.log.error('The debug session startup failed.');
            this.cancel();
            return;
        }

        const subscription = vscode.debug.onDidTerminateDebugSession((session) => {
            if (currentSession != session) { return; }
            this.log.info('Debug session ended');
            this.cancel();
            subscription.dispose();
        });
    }

    cancel(): void {
        if (this.testRunnerProcess !== undefined) {
            this.testRunnerProcess.kill();
        }
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
        adapterConfig.debuggerPort = config.get('debuggerPort') || 9229;

        return adapterConfig;
    }
}
