import { TestLoader } from '../testLoader';

try {
    const testLoader = new TestLoader();
    testLoader
        .load()
        .then(testSuites => process.send(testSuites))
        .catch(err => process.send(err.message));
}
catch (err) {
    process.send(err.message);
}