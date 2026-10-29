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
    for (const name of [
        'package.json',
        'package-lock.json',
        'tsconfig.json',
        'mixed.mts',
        'mixed.cts',
        'runtime.mjs',
    ]) {
        copyFileSync(join(root, 'test/compat', name), join(fixture, name));
    }
    const manifestPath = join(fixture, 'package.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.dependencies['@diplodoc/tabs-extension'] = `file:./${pack.filename}`;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    run(process.execPath, [npm, 'install'], fixture, 'install');
    run(process.execPath, [npm, 'ci'], fixture, 'ci');
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
    run(process.execPath, ['runtime.mjs'], fixture, 'runtime');
    copyFileSync(manifestPath, join(evidence, 'fixture-package.json'));
    copyFileSync(join(fixture, 'package-lock.json'), join(evidence, 'fixture-package-lock.json'));
    const finalStatus = run('git', ['status', '--porcelain'], root, 'source-status-after');
    if (finalStatus !== report.sourceStatus)
        throw new Error('Source status changed during package verification');
    Object.assign(report, {archive: pack.filename, integrity, paths, fileHashes, result: 'passed'});
} finally {
    writeFileSync(join(evidence, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
    rmSync(fixture, {recursive: true, force: true});
    process.stdout.write(`Package evidence: ${evidence}\n`);
}
