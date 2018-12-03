import { TestyTestInfo } from './testyTestInfo';
import { TestyTestSuiteInfo } from './testyTestSuiteInfo';

export class TestyTestRootInfo extends TestyTestSuiteInfo {

    constructor(children: Array<TestyTestRootInfo | TestyTestInfo> = []) {
        // TODO: Not hard code this ID
        super('Um9vdA==', 'TestyTs', children);
    }
}