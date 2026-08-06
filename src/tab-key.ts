import slugify from 'slugify';

const SLUG_OPTIONS = {
    lower: true,
    strict: true,
} as const;

const PUNCTUATION_OR_SPACE_REGEXP = /^[\p{P}\s]$/u;
const PRESERVED_PUNCTUATION = new Set(['#']);

/**
 * Convert characters unsupported by slugify to stable Unicode code point tokens.
 * Punctuation and whitespace keep slugify's default separator/removal behaviour, except for
 * characters such as # that distinguish common tab names (for example C# and C++).
 * @param value - Raw tab key
 * @returns Text safe to pass to slugify
 */
export function encodeUnsupportedCodePoints(value: string): string {
    return Array.from(value.normalize('NFC'))
        .map((character) => {
            if (slugify(character, SLUG_OPTIONS)) {
                return character;
            }

            if (
                PUNCTUATION_OR_SPACE_REGEXP.test(character) &&
                !PRESERVED_PUNCTUATION.has(character)
            ) {
                return character;
            }

            const codePoint = character.codePointAt(0);
            return typeof codePoint === 'number' ? ` u${codePoint.toString(16)} ` : character;
        })
        .join('');
}

/**
 * Create the canonical key stored in tab markup and new URLs.
 * @param value - Raw tab name or custom id
 * @returns Lowercase ASCII slug, with unsupported characters represented as u<hex>
 */
export function createTabKey(value: string): string {
    const normalized = value.normalize('NFC').trim();
    const slug = slugify(encodeUnsupportedCodePoints(normalized), SLUG_OPTIONS);

    if (slug) {
        return slug;
    }

    return Array.from(normalized)
        .map((character) => `u${character.codePointAt(0)?.toString(16)}`)
        .join('-');
}

/**
 * Convert a key read from an old URL to the current canonical form.
 * URLSearchParams has already decoded the outer query layer, so legacy keys need one additional
 * decodeURIComponent call before slug generation.
 * @param value - Key parsed from the tabs query parameter
 * @returns Canonical tab key
 */
export function normalizeTabKeyFromUrl(value: string): string {
    try {
        return createTabKey(decodeURIComponent(value));
    } catch {
        return createTabKey(value);
    }
}
