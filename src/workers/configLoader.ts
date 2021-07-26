import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TestyConfig } from 'testyts/build/lib/interfaces/config';
import { readConfigFile } from 'typescript';

export function loadTestyTsConfig(): TestyConfig {
    return _readFile('testy.json');
}

export function loadTsConfig() {
    const testyTsConfig = loadTestyTsConfig();
    return _readFile(testyTsConfig.tsconfig || 'tsconfig.json');
}

function _readFile(relativePath: string) {
    const absolutePath = resolve(process.cwd(), relativePath);
    const response = readConfigFile(absolutePath, _readFileSync);
    if (response == null || response.error != null) {
        console.warn(`An error occured while reading the file ${absolutePath}: ${response.error.messageText}`);
        return null;
    }

    return response.config;
}

function _readFileSync(path: string): string {
    return readFileSync(path).toString();
}
