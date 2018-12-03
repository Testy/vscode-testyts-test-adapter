import { TestRunnerVisitor } from './testRunner.visitor';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { resolve } from 'path';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { TestRunStartedEvent } from 'vscode-test-adapter-api';
import { TestFinderVisitor } from './testFinder.visitor';

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

    const runner = new TestRunnerVisitor(testsIds);
    await tests.accept(runner);
}