import { TestRunnerVisitor } from './testRunner.visitor';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { resolve } from 'path';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';

process.send(process.argv[2])

try {
    run(JSON.parse(process.argv[2]))
        .then(testSuites => process.send(testSuites))
        .catch(err => process.send(err.message));
}
catch (err) {
    process.send(err.message);
}

async function run(testsIds: string[]): Promise<void> {
    const testLoader = new TestsLoader();
    const tsconfig = require(resolve(process.cwd(), 'tsconfig.json'));
    const testyConfig: TestyConfig = require(resolve(process.cwd(), 'testy.json'));

    const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsconfig);
    const runner = new TestRunnerVisitor(testsIds);
    await tests.accept(runner);
}