import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { resolve } from 'path';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { TestRunStartedEvent } from 'vscode-test-adapter-api';
import { TestFinderVisitor } from './testFinder.visitor';
import { TestRunnerVisitor } from 'testyts/build/lib/tests/visitors/testRunnerVisitor';
import { ProcessMessageTestReporterDecorator } from './processMessageTestReporterDecorator';
import { TestVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { Report } from 'testyts/build/lib/reporting/report/report';

try {
    run(JSON.parse(process.argv[process.argv.length - 1]))
        .catch(err => process.send(err.message));
}
catch (err) {
    process.send(err.message);
}

export async function run(testsIds: string[]): Promise<void> {
    const testLoader = new TestsLoader();
    const tsconfig = require(resolve(process.cwd(), 'tsconfig.json'));
    const testyConfig: TestyConfig = require(resolve(process.cwd(), 'testy.json'));

    const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsconfig);
    testsIds = await tests.accept(new TestFinderVisitor(testsIds));
    process.send(<TestRunStartedEvent>{ type: 'started', tests: testsIds });

    let runner: TestVisitor<Report> = new TestRunnerVisitor();
    runner = new ProcessMessageTestReporterDecorator(runner, testsIds);
    await tests.accept(runner);
}