import { TestsVisitor } from 'testyts/build/lib/tests/visitors/testVisitor';
import { Test } from 'testyts/build/lib/tests/test';
import { TestSuite } from 'testyts/build/lib/tests/testSuite';

export class TestFinderVisitor implements TestsVisitor<string[]>{
    private testSuites: TestSuite[] = [];

    constructor(private testsToRun: string[]) { }

    public async visitTestSuite(testsSuites: TestSuite): Promise<string[]> {
        this.testSuites.push(testsSuites);
        const currentId = this.testSuites.map(x => this.encodeName(x.name)).join('.');
        if (!this.shouldRun(currentId)) {
            this.testSuites.pop();
            return [];
        }

        const tests: string[] = [];
        for (const id of testsSuites.testIds) {
            const testSuite = testsSuites.get(id);
            tests.push(... await testSuite.accept(this));
        }

        this.testSuites.pop();

        return tests;
    }

    public async visitTest(test: Test): Promise<string[]> {
        const currentId = this.testSuites.map(x => this.encodeName(x.name)).join('.') + '.' + this.encodeName(test.name);
        if (!this.shouldRun(currentId)) { return; }

        return [currentId]
    }

    private shouldRun(current: string) {
        const currentSplittedId = current.split('.');
        const currentDepth = currentSplittedId.length;

        for (const testId of this.testsToRun) {
            const splittedId = testId.split('.');
            const idDepth = splittedId.length;
            const minDepth = Math.min(currentDepth, idDepth);

            let matches = true;
            for (let i = 0; i < minDepth; ++i) {
                if (currentSplittedId[i] !== splittedId[i]) {
                    matches = false;
                }
            }

            if (matches) return true;
        }

        return false;
    }

    private encodeName(name: string) {
        return Buffer.from(name).toString('base64');
    }

    private decodeName(encodedName: string) {
        return Buffer.from(encodedName, 'base64').toString('utf8');
    }
}

