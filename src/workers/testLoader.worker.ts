import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { TestsLoader } from 'testyts/build/lib/utils/testsLoader';
import { TestSuiteInfo } from 'vscode-test-adapter-api';
import { loadTestyTsConfig, loadTsConfig } from './configLoader';
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
    try {
        const testLoader = new TestsLoader();
        const testyConfig: TestyConfig = loadTestyTsConfig();
        const tsConfig = loadTsConfig();

        const tests = await testLoader.loadTests(process.cwd(), testyConfig.include, tsConfig);
        const testInfo = await tests.accept(new TestConverterVisitor()) as any;
        return testInfo;
    }
    catch (err) {
        process.send(err.message);
        throw err;
    }
}


