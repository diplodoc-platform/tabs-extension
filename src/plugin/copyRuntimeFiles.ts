import {dirname, join, resolve} from 'node:path';
import {mkdirSync, copyFileSync} from 'node:fs';

const PATH_TO_RUNTIME = '../runtime';

export function copyRuntimeFiles(
    {
        runtimeJsPath,
        runtimeCssPath,
        output,
    }: {runtimeJsPath: string; runtimeCssPath: string; output: string},
    cache: Set<string>,
) {
    const runtimeFiles = {
        'index.js': runtimeJsPath,
        'yfm.css': runtimeCssPath,
    };
    for (const [originFile, outputFile] of Object.entries(runtimeFiles)) {
        const file = join(PATH_TO_RUNTIME, originFile);
        if (!cache.has(file)) {
            cache.add(file);
            copyFile(resolve(__dirname, file), join(output, outputFile));
        }
    }
}

function copyFile(from: string, to: string) {
    mkdirSync(dirname(to), {recursive: true});
    copyFileSync(from, to);
}
