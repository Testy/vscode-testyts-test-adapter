import * as vscode from 'vscode';
import { TestHub, testExplorerExtensionId } from 'vscode-test-adapter-api';
import { Log, TestAdapterRegistrar } from 'vscode-test-adapter-util';
import { TestyTsAdapter } from './adapter';
import { TestLoader } from './testLoader';

export async function activate(context: vscode.ExtensionContext) {

    const workspaceFolder = (vscode.workspace.workspaceFolders || [])[0];
    const log = new Log('testyTsExplorer', workspaceFolder, 'TestyTs Explorer Log');
    context.subscriptions.push(log);

    const testExplorerExtension = vscode.extensions.getExtension<TestHub>(testExplorerExtensionId);
    if (log.enabled) log.info(`Test Explorer ${testExplorerExtension ? '' : 'not '}found`);

    if (testExplorerExtension) {
        const testHub = testExplorerExtension.exports;

        const testLoader = new TestLoader(workspaceFolder);

        context.subscriptions.push(new TestAdapterRegistrar(
            testHub,
            workspaceFolder => new TestyTsAdapter(workspaceFolder, testLoader, log),
            log
        ));
    }
}
