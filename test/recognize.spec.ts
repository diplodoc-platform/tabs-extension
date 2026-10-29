import MarkdownIt from 'markdown-it';
import {describe, expect, it} from 'vitest';

import {recognizeTabsBoundary} from '../src/plugin';

function observations(source: string) {
    const md = new MarkdownIt({html: true});
    md.core.ruler.enableOnly(['normalize', 'block']);
    const tokens = md.parse(source, {});
    const before = JSON.stringify(tokens);
    const found = tokens.map((_, index) => recognizeTabsBoundary(tokens, index)).filter(Boolean);
    expect(JSON.stringify(tokens)).toBe(before);
    return found;
}

describe('pure legacy tabs boundary recognition', () => {
    it('accepts native 15 normalized block tokens', () => {
        const md = new MarkdownIt();
        md.core.ruler.enableOnly(['normalize', 'block']);
        const tokens = md.parse('{% list tabs radio group=shared %}\n\n- A\n\n{% endlist %}', {});
        expect(recognizeTabsBoundary(tokens, 0)?.kind).toBe('open');
    });
    it('distinguishes authored defaults and copies maps', () => {
        const md = new MarkdownIt();
        const tokens: ReturnType<typeof md.parse> = [];
        md.block.parse('{% list tabs %}\n\n- A\n\n{% endlist %}', md, {}, tokens);
        const before = JSON.stringify(tokens);
        const open = recognizeTabsBoundary(tokens, 0);
        expect(open).toEqual({
            kind: 'open',
            raw: '{% list tabs %}',
            map: [0, 1],
            variant: {present: false},
            group: {present: false},
        });
        expect(open?.map).not.toBe(tokens[0].map);
        expect(JSON.stringify(tokens)).toBe(before);
    });
    it('retains authored variant and group spelling', () => {
        expect(
            observations('{% list tabs horizontal group="team" %}\n\n- A\n\n{% endlist %}'),
        ).toEqual([
            {
                kind: 'open',
                raw: '{% list tabs horizontal group="team" %}',
                map: [0, 1],
                variant: {present: true, raw: 'horizontal'},
                group: {present: true, raw: '"team"', value: 'team'},
            },
            {kind: 'close', raw: '{% endlist %}', map: [4, 5]},
        ]);
    });
    it.each([
        '{% list tabs radio radio %}',
        '{% list tabs group=x group=y %}',
        '{% list tabs unknown %}',
        '{% list tabs group= %}',
        '{% list tabs group="two words" %}',
    ])('marks ambiguous legacy header unsupported: %s', (open) => {
        expect(observations(`${open}\n\n- A\n\n{% endlist %}`)[0]?.kind).toBe('unsupported');
    });
    it('returns an opening edge even when the close is missing', () => {
        expect(observations('{% list tabs %}\n\n- A')[0]?.kind).toBe('open');
    });
    it('retains independent edges after an unclosed opening', () => {
        const found = observations(
            '{% list tabs %}\n\nA\n\n{% list tabs radio %}\n\n- B\n\n{% endlist %}',
        );
        expect(found.map((item) => item?.kind)).toEqual(['open', 'open', 'close']);
    });
    it('reports authored empty quoted group according to the legacy unquote helper', () => {
        const found = observations("{% list tabs group='' %}\n\n- A\n\n{% endlist %}");
        expect(found[0]).toMatchObject({
            kind: 'open',
            group: {present: true, raw: "''", value: ''},
        });
    });
    it('does not classify fenced code, HTML, escaped and inline code', () => {
        expect(
            observations(
                '```md\n{% list tabs %}\n{% endlist %}\n```\n\n<div>\n{% list tabs %}\n</div>\n\n`{% list tabs %}`',
            ),
        ).toEqual([]);
    });
    it('recognizes an embedded close only when the renderer accepts its indentation', () => {
        const accepted = '{% list tabs %}\n\n- A\n\n  Body\n\n  {% endlist %}';
        expect(observations(accepted).map((item) => item?.kind)).toEqual(['open', 'close']);
        const rejected = `${accepted}\n\n  Content after`;
        expect(observations(rejected).map((item) => item?.kind)).toEqual(['open', 'close']);
    });
    it('recognizes a dedented block and a following list without altering its maps', () => {
        const source =
            '{% list tabs %}\n\n- A\n\n  Content\n\n# Heading\n\n- B\n\n  Other\n\n{% endlist %}';
        expect(observations(source).map((item) => item?.kind)).toEqual(['open', 'close']);
    });
    it('retains a mixed colon body without classifying colon markers as legacy', () => {
        const source =
            '{% list tabs %}\n\n- A\n\n  :::note {type=info}\n\n  Body\n\n  :::\n\n{% endlist %}';
        expect(observations(source).map((item) => item?.kind)).toEqual(['open', 'close']);
    });
    it('reads nested list and CRLF maps from original block tokens', () => {
        const found = observations(
            '\uFEFF{% list tabs %}\r\n\r\n- A\r\n\r\n  {% list tabs radio %}\r\n\r\n  - B\r\n\r\n  {% endlist %}\r\n\r\n{% endlist %}',
        );
        expect(found.map((x) => x?.kind)).toEqual(['open', 'open', 'close', 'close']);
    });
});
