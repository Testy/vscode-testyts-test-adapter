import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { readFileSync } from 'fs'
import { resolve } from 'path';
import { parse } from 'jsonc-parser'
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

    const testyConfig: TestyConfig = parse(readFileSync(resolve(process.cwd(), 'testy.json'),{encoding:'utf8'}));
    const tsconfig = parse(readFileSync(resolve(process.cwd(), testyConfig.tsconfig || 'tsconfig.json'),{encoding:'utf8'}));

    const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsconfig);
    testsIds = await tests.accept(new TestFinderVisitor(testsIds));
    process.send(<TestRunStartedEvent>{ type: 'started', tests: testsIds });

    let runner: TestVisitor<Report> = new TestRunnerVisitor(process);
    runner = new ProcessMessageTestReporterDecorator(runner, testsIds);
    await tests.accept(runner);
}