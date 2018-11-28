import { TestInfo } from 'vscode-test-adapter-api';

export class TestyTestInfo implements TestInfo {
    public type: 'test' = 'test';
    constructor(public id: string, public label: string, public skipped: boolean) { }
}