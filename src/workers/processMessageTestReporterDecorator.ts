import { TestsVisitorDecorator } from 'testyts/build/lib/tests/visitors/decorators/testsVisitorDecorator';
import { Report } from 'testyts/build/lib/reporting/report/report';
import { FailedTestReport } from 'testyts/build/lib/reporting/report/failedTestReport';
import { SuccessfulTestReport } from 'testyts/build/lib/reporting/report/successfulTestReport';
import { TestInstance } from 'testyts/build/lib/tests/test';
import { TestSuiteInstance } from 'testyts/build/lib/tests/testSuite';
import { RootTestSuite } from 'testyts/build/lib/tests/rootTestSuite';
import { TestVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { TestStatus } from 'testyts/build/lib/testStatus';
import { TestEvent } from 'vscode-test-adapter-api';

export class ProcessMessageTestReporterDecorator extends TestsVisitorDecorator<Report>{
    
    private testSuites: TestSuiteInstance[] = [];

    constructor(baseVisitor: TestVisitor<Report>, private testsToRun: string[], ) {
        super(baseVisitor);
    }

    public async visitTest(test: TestInstance): Promise<Report> {
        const currentId = this.testSuites.map(x => this.encodeName(x.name)).join('.') + '.' + this.encodeName(test.name);
        if (!this.shouldRun(currentId)) { return; }

        if (test.status === TestStatus.Ignored) {
            process.send(<TestEvent>{ type: 'test', state: 'skipped', test: currentId })
            return;
        }

        const report = await this.baseVisitTest(test);

        if (report instanceof FailedTestReport) {
            process.send(<TestEvent>{ type: 'test', state: 'failed', test: currentId, message: report.message })
        }
        else if (report instanceof SuccessfulTestReport) {
            process.send(<TestEvent>{ type: 'test', state: 'passed', test: currentId })
        }
    }

    public async visitTestSuite(testSuite: TestSuiteInstance): Promise<Report> {
        this.testSuites.push(testSuite);
        try {
            return await this.baseVisitTestSuite(testSuite);
        }
        finally {
            this.testSuites.pop();
        }
    }

    public async visitRootTestSuite(tests: RootTestSuite): Promise<Report> {
        return await this.visitTestSuite(tests);
    }

    private shouldRun(current: string) {
        return this.testsToRun.find(x => x === current) !== undefined;
    }

    private encodeName(name: string) {
        return Buffer.from(name).toString('base64');
    }
}