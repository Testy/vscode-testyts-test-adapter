
import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { TestyTestInfo } from './testyTestInfo';

export class TestyTestSuiteInfo implements TestSuiteInfo {
    public file?: string;
    public line?: number;
    public get type(): 'suite' { return 'suite'; }

    constructor(public id: string, public label: string, public children: Array<TestyTestSuiteInfo | TestyTestInfo> = []) { }
}