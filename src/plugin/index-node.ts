import {
    type PluginOptions,
    type TabsDirectivePlugin,
    type TabsPlugin,
    transform as baseTransform,
} from './transform';

export * from './index';

const onBundle: NonNullable<PluginOptions['onBundle']> = (args, cache) => {
    copyRuntimeFiles(args, cache);
};

export function transform(
    options?: Partial<PluginOptions> & {directiveSyntax?: 'disabled'},
): TabsPlugin;
export function transform(
    options: Partial<PluginOptions> & {directiveSyntax: 'enabled' | 'only'},
): TabsDirectivePlugin;
export function transform(options: Partial<PluginOptions>): TabsDirectivePlugin;
export function transform(options: Partial<PluginOptions> = {}): TabsPlugin | TabsDirectivePlugin {
    if (!options.directiveSyntax || options.directiveSyntax === 'disabled') {
        return baseTransform({
            onBundle,
            ...options,
            directiveSyntax: 'disabled',
        });
    }
    return baseTransform({
        onBundle,
        ...options,
        directiveSyntax: options.directiveSyntax,
    });
}

const PATH_TO_RUNTIME = '../runtime';

function copyRuntimeFiles(
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
        'index.css': runtimeCssPath,
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
