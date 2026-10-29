/* eslint-disable import/no-extraneous-dependencies */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

import MarkdownIt13 from 'markdown-it';
import MarkdownIt15 from 'markdown-it-transform15';
import {transform as esmTabs} from '@diplodoc/tabs-extension';

const require = createRequire(import.meta.url);
assert.equal(require('markdown-it/package.json').version, '13.0.2');
assert.equal(require('linkify-it/package.json').version, '5.0.2');
for (const Host of [MarkdownIt13, require('markdown-it')]) {
    const html = new Host({linkify: true}).render('Visit https://example.com and test@example.com');
    assert.match(html, /href="https:\/\/example\.com"/);
    assert.match(html, /href="mailto:test@example\.com"/);
}
const cjsTabs = require('@diplodoc/tabs-extension').transform;
const hosts = [
    MarkdownIt13,
    MarkdownIt15,
    require('markdown-it'),
    require('markdown-it-transform15'),
];
const features = {enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true}};

for (const createTabs of [esmTabs, cjsTabs]) {
    for (const Host of hosts) {
        for (const variant of Object.keys(features.enabledVariants)) {
            const calls = [];
            const generateID = (prefix = '') => {
                calls.push(prefix);
                return `host-${prefix}-${calls.length}`;
            };
            const md = new Host().use(createTabs({bundle: false, features}), {generateID});
            const env = {};
            const html = md.render(
                `{% list tabs ${variant} %}\n\n- First\n\n  One\n\n- Second {selected}\n\n  Two\n\n{% endlist %}`,
                env,
            );
            assert.match(html, new RegExp(`data-diplodoc-variant="${variant}"`));
            assert.match(html, /data-diplodoc-group="host-defaultTabsGroup-1"/);
            assert.match(html, new RegExp(`id="host-${variant}-2"`));
            assert.match(html, new RegExp(`id="host-${variant}-3"`));
            assert.match(html, /data-diplodoc-key="second"/);
            assert.match(html, new RegExp(`id="host-${variant}-3" class="[^"]*\\bactive\\b`));
            assert.deepEqual(calls, ['defaultTabsGroup', variant, variant]);
            assert.deepEqual(env.meta, {
                script: ['_assets/tabs-extension.js'],
                style: ['_assets/tabs-extension.css'],
            });
        }
    }
}
