import {readFileSync, writeFileSync} from 'node:fs';

// Styles are bundled in the separately exported CSS asset, not this source path.
const file = new URL('../build/runtime/index.d.ts', import.meta.url);
const contents = readFileSync(file, 'utf8');
const stylesheetImport = /^import '\.\/scss\/tabs\.scss';\r?\n/gm;
if ([...contents.matchAll(stylesheetImport)].length !== 1) {
    throw new Error('Unexpected runtime declaration stylesheet import');
}
writeFileSync(file, contents.replace(stylesheetImport, 'export {};\n'));
