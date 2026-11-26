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
import {buildSync} from '@diplodoc/infra/esbuild';

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
    const sourceLock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'));
    const lockedDependencies = ['@diplodoc/directive', '@diplodoc/utils', 'markdown-it'];
    const versions = Object.fromEntries(
        lockedDependencies.map((name) => [
            name,
            sourceLock.packages[`node_modules/${name}`].version,
        ]),
    );
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
    for (const name of [
        'tsconfig.json',
        'native.mts',
        'native.cts',
        'reexport.cts',
        'runtime.mjs',
        'shared-directive.mjs',
        'directive-15.spec.ts',
        'native-host.spec.ts',
    ]) {
        const source = name === 'tsconfig.json' ? name : `${name}.template`;
        copyFileSync(join(root, 'test/compat', source), join(fixture, name));
    }
    const manifestPath = join(fixture, 'package.json');
    const manifest = {
        name: 'tabs-native-host-fixture',
        private: true,
        type: 'module',
        dependencies: {
            '@diplodoc/tabs-extension': `file:./${pack.filename}`,
            ...versions,
            '@types/node': '24.10.0',
            '@types/react': '19.2.17',
            jsdom: '20.0.3',
            'markdown-it-attrs': '4.3.1',
            'markdown-it-footnote': '4.0.0',
            typescript: '6.0.3',
            vitest: '3.2.4',
        },
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    run(process.execPath, [npm, 'install', '--strict-peer-deps'], fixture, 'install');
    run(process.execPath, [npm, 'ci', '--strict-peer-deps'], fixture, 'ci');
    run(
        process.execPath,
        [
            join(fixture, 'node_modules/vitest/vitest.mjs'),
            'run',
            '--environment',
            'jsdom',
            'directive-15.spec.ts',
            'native-host.spec.ts',
        ],
        fixture,
        'native15-source-cases',
    );
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
    for (const name of lockedDependencies) {
        const path = `node_modules/${name}`;
        const {version, integrity: installedIntegrity} = lock.packages[path];
        if (
            version !== versions[name] ||
            installedIntegrity !== sourceLock.packages[path].integrity
        )
            throw new Error(`Unexpected locked artifact for ${name}`);
    }
    const require = createRequire(join(fixture, 'package.json'));
    const paths = Object.fromEntries(
        ['@diplodoc/tabs-extension', ...lockedDependencies].map((name) => [
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
    // Both server entries must load the host graph's Directive runtime. Its
    // module-local symbols and boundary registry cannot be duplicated in Tabs.
    for (const entry of ['index.js', 'index-node.js']) {
        const bundle = readFileSync(join(installedDir, 'build/plugin', entry), 'utf8');
        const map = JSON.parse(
            readFileSync(join(installedDir, 'build/plugin', `${entry}.map`), 'utf8'),
        );
        if (!bundle.includes('require("@diplodoc/directive")'))
            throw new Error(`${entry} must load the external Directive runtime`);
        if (
            map.sources.some((source) =>
                /(?:@diplodoc\/directive|markdown-it-directive)\//.test(source),
            )
        )
            throw new Error(`${entry} embeds a private Directive runtime`);
    }
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
    const browserGraph = buildSync({
        stdin: {
            contents:
                "import {transform, recognizeTabsBoundary} from '@diplodoc/tabs-extension/plugin'; globalThis.tabs = {transform, recognizeTabsBoundary};",
            resolveDir: fixture,
        },
        bundle: true,
        platform: 'browser',
        format: 'esm',
        metafile: true,
        write: false,
        logLevel: 'silent',
    });
    if (Object.values(browserGraph.metafile.outputs).some((output) => output.imports.length))
        throw new Error('Pure plugin browser graph has external imports');
    if (Object.keys(browserGraph.metafile.inputs).some((input) => /index-node|node:fs/.test(input)))
        throw new Error('Pure plugin browser graph includes a Node wrapper');
    writeFileSync(
        join(evidence, 'pure-browser-graph.json'),
        JSON.stringify(browserGraph.metafile, null, 2),
    );

    copyFileSync(manifestPath, join(evidence, 'fixture-package.json'));
    copyFileSync(join(fixture, 'package-lock.json'), join(evidence, 'fixture-package-lock.json'));
    run(process.execPath, ['shared-directive.mjs'], fixture, 'shared-directive-runtime');

    const finalStatus = run('git', ['status', '--porcelain'], root, 'source-status-after');
    if (finalStatus !== report.sourceStatus)
        throw new Error('Source status changed during package verification');
    Object.assign(report, {archive: pack.filename, integrity, paths, fileHashes, result: 'passed'});
} finally {
    writeFileSync(join(evidence, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    rmSync(fixture, {recursive: true, force: true});
    process.stdout.write(`Package evidence: ${evidence}\n`);
}
