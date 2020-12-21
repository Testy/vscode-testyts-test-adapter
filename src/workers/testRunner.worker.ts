import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { Report } from 'testyts/build/lib/reporting/report/report';
import { TestRunnerVisitor } from 'testyts/build/lib/tests/visitors/testRunnerVisitor';
import { TestVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { TestRunStartedEvent } from 'vscode-test-adapter-api';
import { loadTestyTsConfig, loadTsConfig } from './configLoader';
import { ProcessMessageTestReporterDecorator } from './processMessageTestReporterDecorator';
import { TestFinderVisitor } from './testFinder.visitor';

try {
    run(JSON.parse(process.argv[process.argv.length - 1]))
        .catch(err => process.send(err.message));
}
catch (err) {
    process.send(err.message);
}

export async function run(testsIds: string[]): Promise<void> {
    try {
        const testLoader = new TestsLoader();
        const testyConfig: TestyConfig = loadTestyTsConfig();
        const tsConfig = loadTsConfig();

        const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsConfig);
        testsIds = await tests.accept(new TestFinderVisitor(testsIds));
        process.send(<TestRunStartedEvent>{ type: 'started', tests: testsIds });

        let runner: TestVisitor<Report> = new TestRunnerVisitor(process, testyConfig);
        runner = new ProcessMessageTestReporterDecorator(runner, testsIds);
        await tests.accept(runner);
    }
    catch (err) {
        process.send(err.message);
        throw err;
    }
}