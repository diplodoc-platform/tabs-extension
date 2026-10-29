import MarkdownIt13 from 'markdown-it';
import MarkdownIt15 from 'markdown-it-transform15';
import {describe, expect, it} from 'vitest';

import {transform} from '../src/plugin/transform';

const features = {enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true}};

describe.each([
    [
        'markdown-it 13',
        (plugin: ReturnType<typeof transform>, generateID: (prefix?: string) => string) =>
            new MarkdownIt13().use(plugin, {generateID}),
    ],
    [
        'markdown-it 15',
        (plugin: ReturnType<typeof transform>, generateID: (prefix?: string) => string) =>
            new MarkdownIt15().use(plugin, {generateID}),
    ],
])('%s', (_name, createParser) => {
    it.each(['regular', 'radio', 'dropdown', 'accordion'])(
        'preserves %s tabs and host IDs',
        (variant) => {
            const calls: string[] = [];
            const generateID = (prefix = '') => {
                calls.push(prefix);
                return `host-${prefix}-${calls.length}`;
            };
            const env: {meta?: {script: string[]; style: string[]}} = {};
            const plugin = transform({bundle: false, features});
            const md = createParser(plugin, generateID);
            const html = md.render(
                `{% list tabs ${variant} %}\n\n- First\n\n  One\n\n- Second {selected}\n\n  Two\n\n{% endlist %}`,
                env,
            );

            expect(html).toContain(`data-diplodoc-variant="${variant}"`);
            expect(html).toContain('data-diplodoc-group="host-defaultTabsGroup-1"');
            expect(html).toContain(`id="host-${variant}-2"`);
            expect(html).toContain(`id="host-${variant}-3"`);
            expect(html).toContain('data-diplodoc-key="second"');
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            expect(wrapper.querySelector(`#host-${variant}-3`)?.classList.contains('active')).toBe(
                true,
            );
            expect(calls).toEqual(['defaultTabsGroup', variant, variant]);
            expect(env.meta).toEqual({
                script: ['_assets/tabs-extension.js'],
                style: ['_assets/tabs-extension.css'],
            });
        },
    );
});
