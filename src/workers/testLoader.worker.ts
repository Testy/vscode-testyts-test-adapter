import { resolve } from 'path';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { TestConverterVisitor } from './testConverter.visitor';

try {
    load()
        .then(response => process.send(response))
        .catch(err => process.send(err.message));
}
catch (err) {
    process.send(err.message);
}

export async function load(): Promise<TestSuiteInfo> {
    const testLoader = new TestsLoader();
    const tsconfig = require(resolve(process.cwd(), 'tsconfig.json'));
    const testyConfig: TestyConfig = require(resolve(process.cwd(), 'testy.json'));

    const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsconfig);
    const testInfo = await tests.accept(new TestConverterVisitor()) as any;
    return testInfo;
}
