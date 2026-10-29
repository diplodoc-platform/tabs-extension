import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {
    copyFileSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, isAbsolute, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const evidenceRoot = resolve(process.env.TABS_PACKAGE_EVIDENCE_DIR || tmpdir());
mkdirSync(evidenceRoot, {recursive: true});
const evidence = mkdtempSync(join(evidenceRoot, 'tabs-package-'));
const fixture = mkdtempSync(join(tmpdir(), 'tabs-fixture-'));
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this check with npm run test:package.');
const report = {node: process.version, evidence, commands: []};

function run(command, args, cwd, label) {
    const result = spawnSync(command, args, {
        cwd,
        encoding: 'utf8',
    });
    writeFileSync(join(evidence, `${label}.stdout.log`), result.stdout || '');
    writeFileSync(join(evidence, `${label}.stderr.log`), result.stderr || '');
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    report.commands.push({command, args, cwd, status: result.status});
    if (result.error || result.status !== 0)
        throw result.error || new Error(`${label} failed: ${result.status}`);
    return result.stdout;
}

function files(dir, base = dir) {
    return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? files(path, base) : [relative(base, path)];
    });
}

function digest(bytes) {
    return createHash('sha512').update(bytes).digest('base64');
}

try {
    report.sourceHead = run('git', ['rev-parse', 'HEAD'], root, 'source-head').trim();
    report.sourceStatus = run('git', ['status', '--porcelain'], root, 'source-status');
    report.npm = run(process.execPath, [npm, '--version'], root, 'npm-version').trim();
    run(process.execPath, [npm, 'run', 'build'], root, 'build');
    const pack = JSON.parse(
        run(
            process.execPath,
            [npm, 'pack', '--json', '--pack-destination', evidence],
            root,
            'pack',
        ),
    )[0];
    const archive = join(evidence, pack.filename);
    const archiveBytes = readFileSync(archive);
    const integrity = `sha512-${digest(archiveBytes)}`;
    if (pack.integrity !== integrity)
        throw new Error('npm pack integrity differs from archive bytes');
    copyFileSync(archive, join(fixture, pack.filename));
    for (const name of ['tsconfig.json', 'mixed.mts', 'mixed.cts', 'reexport.cts', 'runtime.mjs']) {
        const source = name === 'tsconfig.json' ? name : `${name}.template`;
        copyFileSync(join(root, 'test/compat', source), join(fixture, name));
    }
    const manifestPath = join(fixture, 'package.json');
    // Markdown-it 13 is required to reproduce the mixed-host boundary. Its
    // known advisories remain visible in the recorded audit; the override only
    // fixes linkify-it for this temporary fixture, not the product graph.
    const manifest = {
        name: 'tabs-mixed-host-fixture',
        private: true,
        type: 'module',
        overrides: {'markdown-it': {'linkify-it': '5.0.2'}},
        dependencies: {
            '@diplodoc/tabs-extension': `file:./${pack.filename}`,
            '@diplodoc/utils': '2.3.7-transform5.0',
            '@types/markdown-it': '13.0.9',
            '@types/node': '24.10.0',
            '@types/react': '19.2.17',
            'markdown-it': '13.0.2',
            'markdown-it-transform15': 'npm:markdown-it@15.0.3',
            typescript: '6.0.3',
        },
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    run(process.execPath, [npm, 'install'], fixture, 'install');
    run(process.execPath, [npm, 'ci'], fixture, 'ci');
    const audit = spawnSync(process.execPath, [npm, 'audit', '--json'], {
        cwd: fixture,
        encoding: 'utf8',
    });
    writeFileSync(join(evidence, 'fixture-audit.json'), audit.stdout || '');
    writeFileSync(join(evidence, 'fixture-audit.stderr.log'), audit.stderr || '');
    if (audit.error || (audit.status !== 0 && audit.status !== 1))
        throw audit.error || new Error(`Fixture audit failed to run: ${audit.status}`);
    report.fixtureAudit = {status: audit.status, metadata: JSON.parse(audit.stdout).metadata};
    const lock = JSON.parse(readFileSync(join(fixture, 'package-lock.json'), 'utf8'));
    const locked = lock.packages['node_modules/@diplodoc/tabs-extension'];
    if (locked.integrity !== integrity || locked.resolved !== `file:${pack.filename}`)
        throw new Error('Candidate lock integrity or path differs');
    const require = createRequire(join(fixture, 'package.json'));
    const paths = Object.fromEntries(
        ['@diplodoc/tabs-extension', 'markdown-it', 'markdown-it-transform15'].map((name) => [
            name,
            realpathSync(require.resolve(name)),
        ]),
    );
    for (const [name, path] of Object.entries(paths)) {
        const moduleRoot = realpathSync(join(fixture, 'node_modules', name));
        const location = relative(moduleRoot, path);
        if (location.startsWith('..') || isAbsolute(location))
            throw new Error(`Unexpected module path for ${name}: ${path}`);
    }
    const extracted = join(fixture, 'extracted');
    mkdirSync(extracted);
    run('tar', ['-xzf', archive, '-C', extracted], fixture, 'extract');
    const packedDir = join(extracted, 'package');
    const installedDir = join(fixture, 'node_modules/@diplodoc/tabs-extension');
    const packedFiles = files(packedDir).sort();
    const installedFiles = files(installedDir).sort();
    if (JSON.stringify(packedFiles) !== JSON.stringify(installedFiles))
        throw new Error('Installed file list differs from packed file list');
    const fileHashes = {};
    for (const name of packedFiles) {
        const packedHash = digest(readFileSync(join(packedDir, name)));
        if (packedHash !== digest(readFileSync(join(installedDir, name))))
            throw new Error(`Installed bytes differ: ${name}`);
        fileHashes[name] = `sha512-${packedHash}`;
    }
    run(
        process.execPath,
        [join(fixture, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'],
        fixture,
        'typecheck',
    );
    run(
        process.execPath,
        [
            join(fixture, 'node_modules/typescript/bin/tsc'),
            '--ignoreConfig',
            '--strict',
            '--skipLibCheck',
            'false',
            '--module',
            'NodeNext',
            '--moduleResolution',
            'NodeNext',
            '--target',
            'ES2022',
            '--declaration',
            '--emitDeclarationOnly',
            '--outDir',
            'declarations',
            'reexport.cts',
        ],
        fixture,
        'reexport-declarations',
    );
    const declaration = readFileSync(join(fixture, 'declarations/reexport.d.cts'), 'utf8');
    if (!declaration.includes('@diplodoc/tabs-extension') || declaration.includes('/build/'))
        throw new Error('Re-export declaration is not portable through the package root');
    run(process.execPath, ['runtime.mjs'], fixture, 'runtime');
    copyFileSync(manifestPath, join(evidence, 'fixture-package.json'));
    copyFileSync(join(fixture, 'package-lock.json'), join(evidence, 'fixture-package-lock.json'));
    const fixture14 = join(fixture, 'native14');
    mkdirSync(fixture14);
    copyFileSync(archive, join(fixture14, pack.filename));
    const manifest14 = {
        private: true,
        type: 'module',
        overrides: {'markdown-it': {mdurl: '2.0.0'}},
        dependencies: {
            '@diplodoc/tabs-extension': `file:./${pack.filename}`,
            '@types/markdown-it': '14.1.0',
            '@types/node': '24.10.0',
            '@types/react': '19.2.17',
            'markdown-it': '14.1.0',
            typescript: '6.0.3',
        },
    };
    writeFileSync(join(fixture14, 'package.json'), `${JSON.stringify(manifest14, null, 2)}\n`);
    const typeFixture14 = `import MarkdownIt from 'markdown-it';
import {transform} from '@diplodoc/tabs-extension';
new MarkdownIt().use(transform({bundle: false, directiveSyntax: 'enabled'}));
new MarkdownIt().use(transform({bundle: false, directiveSyntax: 'only'}));
`;
    writeFileSync(join(fixture14, 'native.mts'), typeFixture14);
    writeFileSync(join(fixture14, 'native.cts'), typeFixture14);
    writeFileSync(
        join(fixture14, 'tsconfig.json'),
        JSON.stringify(
            {
                compilerOptions: {
                    target: 'ES2022',
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    strict: true,
                    skipLibCheck: false,
                    noEmit: true,
                    types: ['node'],
                },
                include: [
                    'native.mts',
                    'native.cts',
                    'node_modules/@diplodoc/tabs-extension/build/**/*.d.ts',
                ],
            },
            null,
            2,
        ),
    );
    writeFileSync(
        join(fixture14, 'runtime.mjs'),
        `import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import MarkdownIt from 'markdown-it';
import {transform} from '@diplodoc/tabs-extension';
const require = createRequire(import.meta.url);
assert.equal(require('markdown-it/package.json').version, '14.1.0');
assert.equal(require('mdurl/package.json').version, '2.0.0');
for (const Host of [MarkdownIt, require('markdown-it')]) {
  for (const plugin of [transform, require('@diplodoc/tabs-extension').transform, require('./node_modules/@diplodoc/tabs-extension/build/plugin/index.js').transform]) {
    const html = new Host().use(plugin({bundle:false, directiveSyntax:'enabled'})).render(':::tabs\\n\\n- First\\n\\n:::');
    assert.match(html, /yfm-tabs/);
  }
}
`,
    );
    run(process.execPath, [npm, 'install'], fixture14, 'native14-install');
    run(process.execPath, [npm, 'ci'], fixture14, 'native14-ci');
    run(
        process.execPath,
        [join(fixture14, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'],
        fixture14,
        'native14-typecheck',
    );
    run(process.execPath, ['runtime.mjs'], fixture14, 'native14-runtime');
    copyFileSync(join(fixture14, 'package.json'), join(evidence, 'native14-package.json'));
    copyFileSync(
        join(fixture14, 'package-lock.json'),
        join(evidence, 'native14-package-lock.json'),
    );
    const finalStatus = run('git', ['status', '--porcelain'], root, 'source-status-after');
    if (finalStatus !== report.sourceStatus)
        throw new Error('Source status changed during package verification');
    Object.assign(report, {archive: pack.filename, integrity, paths, fileHashes, result: 'passed'});
} finally {
    writeFileSync(join(evidence, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    rmSync(fixture, {recursive: true, force: true});
    process.stdout.write(`Package evidence: ${evidence}\n`);
}
