const PATH_TO_RUNTIME = '../runtime';

export function copyRuntimeFiles(
    {
        runtimeJsPath,
        runtimeCssPath,
        output,
    }: {runtimeJsPath: string; runtimeCssPath: string; output: string},
    cache: Set<string>,
) {
    const {join, resolve} = require('node:path');
    const runtimeFiles = {
        'index.js': runtimeJsPath,
        'styles.css': runtimeCssPath,
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
    const {mkdirSync, copyFileSync} = require('node:fs');
    const {dirname} = require('node:path');
    mkdirSync(dirname(to), {recursive: true});
    copyFileSync(from, to);
}
