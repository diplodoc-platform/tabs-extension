import {describe, expect, it} from 'vitest';

import {createTabKey, encodeUnsupportedCodePoints, normalizeTabKeyFromUrl} from '../src/tab-key';

describe('tab keys', () => {
    it.each([
        ['Второй русский таб', 'vtoroj-russkij-tab'],
        ['Русский таб 🔥', 'russkij-tab-u1f525'],
        ['🔥', 'u1f525'],
        ['👨‍💻', 'u1f468-u200d-u1f4bb'],
        ['中文', 'u4e2d-u6587'],
        ['C#', 'c-u23'],
        ['C++', 'c-u2b-u2b'],
    ])('creates a stable key for %s', (value, expected) => {
        expect(createTabKey(value)).toBe(expected);
    });

    it('keeps ordinary punctuation subject to slugify rules', () => {
        expect(createTabKey('Привет, мир!')).toBe('privet-mir');
    });

    it('encodes unsupported code points before slugification', () => {
        expect(encodeUnsupportedCodePoints('Таб 🔥')).toBe('Таб  u1f525 ');
    });

    it('normalizes a legacy URL-encoded Russian key', () => {
        const legacyKey = encodeURIComponent('Второй русский таб').toLocaleLowerCase();

        expect(normalizeTabKeyFromUrl(legacyKey)).toBe('vtoroj-russkij-tab');
    });

    it('accepts a current slug key without changing it', () => {
        expect(normalizeTabKeyFromUrl('vtoroj-russkij-tab')).toBe('vtoroj-russkij-tab');
    });
});
