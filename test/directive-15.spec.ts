import Constructor from 'markdown-it-transform15';
import {describe, expect, it} from 'vitest';

import {transform} from '../src/plugin/transform';
const features = {enabledVariants: {regular: true, radio: true, dropdown: true, accordion: true}};
describe('tabs directives on markdown-it 15', () => {
    function parse(source: string, directiveSyntax: 'enabled' | 'only' = 'enabled') {
        const calls: string[] = [];
        const env = {};
        const md = new Constructor();
        md.use(transform({bundle: false, features, directiveSyntax}), {
            generateID: (prefix = '') => {
                calls.push(prefix);
                return `${prefix}-${calls.length}`;
            },
        });
        const tokens = md.parse(source, env);
        return {html: md.renderer.render(tokens, md.options, env), tokens, calls, env};
    }
    it.each(['regular', 'radio', 'dropdown', 'accordion'])(
        'matches legacy %s with selected item and explicit group',
        (variant) => {
            const body = '\n- First\n\n  One\n\n- Second {selected}\n\n  Two\n\n';
            const old = parse(`{% list tabs ${variant} group=shared %}${body}{% endlist %}`);
            const current = parse(`:::tabs {variant=${variant} group="shared"}${body}:::`);
            expect(current.html).toBe(old.html);
            expect(current.calls).toEqual(old.calls);
            expect(current.env).toEqual(old.env);
            expect(
                current.tokens.map(({type, map, level, nesting}) => ({type, map, level, nesting})),
            ).toEqual(
                old.tokens.map(({type, map, level, nesting}) => ({type, map, level, nesting})),
            );
        },
    );
    it.each([
        ['title', ':::tabs [title]'],
        ['destination', ':::tabs (url)'],
        ['unknown attribute', ':::tabs {other=value}'],
        ['class', ':::tabs {.extra}'],
        ['empty group', ':::tabs {group=""}'],
        ['repeated group', ':::tabs {group=one group=two}'],
        ['repeated variant', ':::tabs {variant=radio variant=regular}'],
    ])('preserves invalid %s as literal', (_case, opener) => {
        const reasons: string[] = [];
        const md = new Constructor();
        md.use(
            transform({
                bundle: false,
                directiveSyntax: 'enabled',
                onDiagnostic: ({reason}) => reasons.push(reason),
            }),
        );
        const output = md.render(`${opener}\n\n- First\n\n:::`);
        expect(output).toContain(':::tabs');
        expect(output).not.toContain('class="yfm-tabs');
        expect(reasons).toHaveLength(1);
    });
    it('only mode keeps legacy literal while parsing colon', () => {
        expect(parse('{% list tabs %}\n\n- A\n\n{% endlist %}', 'only').html).toContain(
            '{% list tabs %}',
        );
        expect(parse(':::tabs\n\n- A\n\n:::', 'only').html).toContain('yfm-tabs');
    });
    it('handles ordered and nested colon tabs', () => {
        const result = parse(
            ':::tabs\n\n1. Outer\n\n   :::tabs {variant=radio}\n\n   - Inner\n\n     Body\n\n   :::\n\n:::',
        );
        expect(result.html.match(/class="yfm-tabs/g)).toHaveLength(2);
        expect(result.html).toContain('Inner');
        expect(result.html).not.toContain('yfm_tabs_directive');
    });
    it('handles mixed nested legacy and colon tabs', () => {
        const source =
            '{% list tabs %}\n\n- Outer\n\n  :::tabs\n\n  - Inner\n\n    Text\n\n  :::\n\n{% endlist %}';
        const result = parse(source);
        expect(result.html.match(/class="yfm-tabs/g)).toHaveLength(2);
        expect(result.html).toContain('Inner');
        expect(result.html).not.toContain('yfm_tabs_directive');
    });
    it('handles legacy tabs nested inside colon tabs', () => {
        const source =
            ':::tabs\n\n- Outer\n\n  {% list tabs %}\n\n  - Inner\n\n    Text\n\n  {% endlist %}\n\n:::';
        const result = parse(source);
        expect(result.html.match(/class="yfm-tabs/g)).toHaveLength(2);
        expect(result.html).toContain('Inner');
        expect(result.html).not.toContain('yfm_tabs_directive');
    });
    it('retains fenced code and escaped openers as literal without resources', () => {
        const result = parse('```md\n:::tabs\n\n- A\n\n:::\n```\n\n\\:::tabs');
        expect(result.html).toContain(':::tabs');
        expect(result.env).not.toHaveProperty('meta');
        expect(result.calls).toEqual([]);
    });
    it('falls back to regular for a disabled valid variant', () => {
        const calls: string[] = [];
        const md = new Constructor();
        md.use(
            transform({
                bundle: false,
                directiveSyntax: 'enabled',
                features: {enabledVariants: {regular: true}},
            }),
            {
                generateID: (prefix = '') => {
                    calls.push(prefix);
                    return `${prefix}-${calls.length}`;
                },
            },
        );
        const html = md.render(':::tabs {variant=accordion group=shared}\n\n- A\n\n:::');
        expect(html).toContain('data-diplodoc-variant="regular"');
        expect(html).toContain('data-diplodoc-group="shared"');
        expect(calls).toEqual(['defaultTabsGroup', 'regular']);
    });
    it.each([false, true])('keeps task body footnote references with attrs=%s', (attrs) => {
        const md = new Constructor();
        md.use(require('markdown-it-footnote'));
        if (attrs) md.use(require('markdown-it-attrs'));
        md.use(transform({bundle: false, directiveSyntax: 'enabled', features}), {
            generateID: (prefix = '') => `${prefix}-id`,
        });
        const output = md.render(':::tabs\n\n- A\n\n  Body[^x].\n\n:::\n\n[^x]: Footnote text');
        expect(output).toContain('yfm-tabs');
        expect(output).toContain('footnote-ref');
        expect(output).toContain('Footnote text');
        expect(output).not.toContain('yfm_tabs_directive');
    });
    it('removes an empty directive without producing resources', () => {
        const result = parse(':::tabs\n\nplain text\n\n:::');
        expect(result.html).toBe('');
        expect(result.env).not.toHaveProperty('meta');
        expect(result.calls).toEqual(['defaultTabsGroup']);
    });
    it.each(['missing', 'clone', 'crossed'])(
        'fails closed on %s markers before IDs and resources',
        (kind) => {
            const calls: string[] = [];
            const env = {};
            const md = new Constructor();
            md.use(transform({bundle: false, directiveSyntax: 'enabled'}), {
                generateID: (prefix = '') => {
                    calls.push(prefix);
                    return prefix;
                },
            });
            md.core.ruler.before('tabs', 'damage-markers', (state) => {
                const opens = state.tokens.filter(
                    (token) => token.type === 'yfm_tabs_directive_open',
                );
                const closes = state.tokens.filter(
                    (token) => token.type === 'yfm_tabs_directive_close',
                );
                if (kind === 'missing') state.tokens.splice(state.tokens.indexOf(closes[0]), 1);
                if (kind === 'clone') {
                    const token = new state.Token(opens[0].type, '', 0);
                    state.tokens[state.tokens.indexOf(opens[0])] = token;
                }
                if (kind === 'crossed') {
                    const first = state.tokens.indexOf(closes[0]);
                    const second = state.tokens.indexOf(closes[1]);
                    [state.tokens[first], state.tokens[second]] = [
                        state.tokens[second],
                        state.tokens[first],
                    ];
                }
            });
            const source = ':::tabs\n\n- A\n\n  :::tabs\n\n  - B\n\n  :::\n\n:::';
            expect(() => md.parse(source, env)).toThrow(/tabs directive/i);
            expect(calls).toEqual([]);
            expect(env).not.toHaveProperty('meta');
            expect(env).not.toHaveProperty('bundled');
        },
    );
    it('rejects unsupported attrs without generating resources or IDs', () => {
        const diagnostics: string[] = [];
        const calls: string[] = [];
        const md = new Constructor();
        md.use(
            transform({
                bundle: false,
                directiveSyntax: 'enabled',
                onDiagnostic: ({reason}) => diagnostics.push(reason),
            }),
            {
                generateID: (prefix = '') => {
                    calls.push(prefix);
                    return prefix;
                },
            },
        );
        const env = {};
        expect(md.render(':::tabs {variant=robot}\n\n- A\n\n:::', env)).toContain(':::tabs');
        expect(diagnostics).toHaveLength(1);
        expect(calls).toEqual([]);
        expect(env).not.toHaveProperty('meta');
    });
});
