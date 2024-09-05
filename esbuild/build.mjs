#!/usr/bin/env node

import {build} from 'esbuild';
import {sassPlugin} from 'esbuild-sass-plugin';

import tsconfigJson from '../tsconfig.json' assert {type: 'json'};
import packageJson from '../package.json' assert {type: 'json'};

const outDir = 'build';

/** @type {import('esbuild').BuildOptions}*/
const common = {
    bundle: true,
    sourcemap: true,
    target: tsconfigJson.compilerOptions.target,
    tsconfig: './tsconfig.json',
};

/** @type {import('esbuild').BuildOptions}*/
const runtime = {
    ...common,
    entryPoints: ['src/runtime/index.ts'],
    outfile: outDir + '/runtime/index.js',
    minify: true,
    platform: 'browser',
    plugins: [sassPlugin()],
};

/** @type {import('esbuild').BuildOptions}*/
const react = {
    ...common,
    entryPoints: ['src/react/index.ts'],
    outfile: outDir + '/react/index.js',
    platform: 'neutral',
    external: ['react'],
    target: 'es6',
    format: 'cjs',
};

/** @type {import('esbuild').BuildOptions}*/
const plugin = {
    ...common,
    entryPoints: ['src/plugin/index.ts'],
    outfile: outDir + '/plugin/index.js',
    platform: 'node',
    external: ['markdown-it', 'node:*'],
    define: {
        PACKAGE: JSON.stringify(packageJson.name),
    },
};

build(plugin);
build(runtime);
build(react);
