import type {TabsItemSource} from '../src/plugin/transform';

import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import {transform} from '../src/plugin/transform';
import {observeTabName} from '../src/plugin/utils/tabs';

const features = {enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true}};

function parse(source: string, observe: boolean) {
    const snapshots: TabsItemSource[] = [];
    const ids: string[] = [];
    const env = {};
    const md = new MarkdownIt();
    md.use(
        transform({
            bundle: false,
            directiveSyntax: 'enabled',
            features,
            onItemSource: observe ? (snapshot) => snapshots.push(snapshot) : undefined,
        }),
        {
            generateID: (prefix = '') => {
                ids.push(prefix);
                return `${prefix}-${ids.length}`;
            },
        },
    );
    const tokens = md.parse(source, env);
    return {html: md.renderer.render(tokens, md.options, env), tokens, env, ids, snapshots};
}

describe('item source observations', () => {
    it.each(['regular', 'radio', 'dropdown', 'accordion'])(
        '%s retains output for both syntaxes',
        (variant) => {
            for (const colon of [false, true]) {
                for (const compact of [false, true]) {
                    const body = compact
                        ? '\n\n- First\n- Second {selected} {#custom}\n\n'
                        : '\n\n- First\n\n  Body\n\n- Second {selected} {#custom}\n\n  Other\n\n';
                    const source = colon
                        ? `:::tabs {variant=${variant} group=shared}${body}:::`
                        : `{% list tabs ${variant} group=shared %}${body}{% endlist %}`;
                    const baseline = parse(source, false);
                    const observed = parse(source, true);
                    expect(observed.html).toEqual(baseline.html);
                    expect(observed.tokens).toEqual(baseline.tokens);
                    expect(observed.env).toEqual(baseline.env);
                    expect(observed.ids).toEqual(baseline.ids);
                    expect(observed.snapshots.map(({rawName}) => rawName)).toEqual([
                        'First',
                        'Second {selected} {#custom}',
                    ]);
                    const second = observed.snapshots[1];
                    expect(second.kind).toBe('ok');
                    if (second.kind !== 'ok') throw new Error('expected observation');
                    expect(second.markers).toEqual({
                        customAnchor: [18, 27],
                        selectedForActivation: [7, 17],
                        selectedForDisplay: [7, 17],
                    });
                    expect(second.inlineMap).not.toBeNull();
                    expect(Object.isFrozen(second)).toBe(true);
                    expect(Object.isFrozen(second.inlineMap)).toBe(true);
                    expect(Object.isFrozen(second.containerMap)).toBe(true);
                    expect(Object.isFrozen(second.markers)).toBe(true);
                    expect(Object.isFrozen(second.markers.customAnchor)).toBe(true);
                }
            }
        },
    );

    it('propagates callback exceptions', () => {
        const error = new Error('stop');
        const md = new MarkdownIt();
        md.use(
            transform({
                bundle: false,
                onItemSource: () => {
                    throw error;
                },
            }),
        );
        expect(() => md.parse('{% list tabs %}\n\n- A\n\n{% endlist %}', {})).toThrow(error);
    });

    it('reports a marker created across a removed anchor as unsupported', () => {
        expect(observeTabName('x {sel{#id }ected} {selected}')).toEqual({
            kind: 'unsupported',
            reason: 'discontinuous-display-marker',
        });
    });

    it.each([
        ['Second {selected} {#custom}', [18, 27], [7, 17], [7, 17]],
        ['Escaped \\[x\\] [{#id}]', [14, 21], null, null],
        ['First\nline {selected}', null, [11, 21], [11, 21]],
        ['{selected} {selected} {#one} {#two}', [22, 28], [0, 10], [0, 10]],
        ['`{selected}` {#anchor}', [13, 22], [1, 11], [1, 11]],
        ['{#one} Name {selected}', [0, 6], [12, 22], [12, 22]],
        ['Name { selected } {selected=true}', null, null, null],
        ['x {#id{selected}} y', [2, 17], [6, 16], null],
        ['Name [{ #anchor }]', [5, 18], null, null],
    ])('reports canonical ranges in %s', (raw, anchor, activation, display) => {
        expect(observeTabName(raw)).toEqual({
            kind: 'ok',
            markers: {
                customAnchor: anchor,
                selectedForActivation: activation,
                selectedForDisplay: display,
            },
        });
    });

    it('observes nested owner results and ignores fenced list text', () => {
        const source =
            ':::tabs\n\n- Outer\n\n  ```md\n  - Fake {selected}\n  ```\n\n  {% list tabs %}\n\n  - Inner {#id}\n\n  {% endlist %}\n\n:::';
        const observed = parse(source, true);
        expect(observed.snapshots.map(({rawName}) => rawName)).toEqual(['Outer', 'Inner {#id}']);
        expect(observed.snapshots[0].containerMap).toEqual([0, 15]);
        expect(observed.snapshots[1].containerMap).toEqual([8, 13]);
    });

    it('keeps snapshots across parses and emits none for an invalid or empty block', () => {
        const snapshots: TabsItemSource[] = [];
        const md = new MarkdownIt();
        md.use(
            transform({
                bundle: false,
                directiveSyntax: 'enabled',
                onItemSource: (snapshot) => snapshots.push(snapshot),
            }),
        );
        md.parse(':::tabs\n\n- A {selected}\n\n:::', {});
        const first = JSON.stringify(snapshots[0]);
        md.parse(':::tabs\n\nplain text\n\n:::', {});
        md.parse(':::tabs {variant=invalid}\n\n- B\n\n:::', {});
        md.parse(':::tabs\n\n- C\n\n:::', {});
        expect(snapshots.map(({rawName}) => rawName)).toEqual(['A {selected}', 'C']);
        expect(JSON.stringify(snapshots[0])).toBe(first);
    });

    it('refuses an accepted item without a title paragraph', () => {
        const observed = parse('{% list tabs %}\n\n- ```\n  code\n  ```\n\n{% endlist %}', true);
        expect(observed.snapshots).toHaveLength(1);
        expect(observed.snapshots[0]).toMatchObject({
            kind: 'unsupported',
            reason: 'missing-title',
            inlineMap: null,
        });
    });

    it('keeps owner results and maps when a list is interrupted', () => {
        const source =
            '{% list tabs %}\n\n- First\n\n  Body\n\n# Interruption\n\n- Second {selected}\n\n{% endlist %}';
        const baseline = parse(source, false);
        const observed = parse(source, true);
        expect(observed.html).toEqual(baseline.html);
        expect(observed.snapshots.map(({rawName, inlineMap}) => ({rawName, inlineMap}))).toEqual([
            {rawName: 'First', inlineMap: [2, 3]},
            {rawName: 'Second {selected}', inlineMap: [8, 9]},
        ]);
    });
});
