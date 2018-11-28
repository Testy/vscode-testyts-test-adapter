import { TestyTestInfo } from './testyTestInfo';
import { TestyTestSuiteInfo } from './testyTestSuiteInfo';

export class TestyTestRootInfo extends TestyTestSuiteInfo {

    constructor(children: Array<TestyTestRootInfo | TestyTestInfo> = []) {
        super('root', 'TestyTs', children);
    }
}