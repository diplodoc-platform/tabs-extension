import type {StateCore, Token} from './markdown-it';
/**
 * Parsing of `{% list tabs %}` blocks: locate open/close tags, parse props, and extract tab items
 * from the list tokens between them.
 */
import type {RuntimeTab, TabsProps} from './types';
import type {IDGenerator} from '@diplodoc/utils';

import {DEFAULT_TABS_GROUP_PREFIX, TAB_RE, TabsVariants} from '../common';

import {trim, unquote} from './utils';

export type TabsBoundaryToken = {
    readonly type: string;
    readonly content: string;
    readonly map: readonly [number, number] | null;
};

/**
 * Find the token index of the matching `{% endlist %}` for a list starting at idx.
 * @param tokens - Full token list
 * @param idx - Start index
 * @returns Index of close token or null
 */
function findCloseTokenIndex(tokens: Token[], idx: number): number | null {
    let level = 0;
    let i = idx;
    while (i < tokens.length) {
        if (matchOpenToken(tokens, i)) {
            level++;
        } else if (matchCloseToken(tokens, i)) {
            if (level === 0) {
                return i;
            }
            level--;
        }

        i++;
    }

    return null;
}

function matchCloseToken(tokens: readonly TabsBoundaryToken[], i: number): boolean {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endlist %}'
    );
}

function matchOpenToken(tokens: readonly TabsBoundaryToken[], i: number): RegExpMatchArray | null {
    if (tokens[i].type !== 'paragraph_open' || tokens[i + 1].type !== 'inline') {
        return null;
    }
    return tokens[i + 1].content.match(TAB_RE);
}

/**
 * Allocate a default group even when a source provides an explicit group.
 * @param generateID - Per-file ID generator
 * @returns Generated default group
 */
export function defaultTabsGroup(generateID: IDGenerator): string {
    return generateID(DEFAULT_TABS_GROUP_PREFIX.replace(/-$/, ''));
}

/**
 * Parse `{% list tabs group=... %}` content into variant and group id.
 * @param content - Raw tag content after "list tabs"
 * @param generateID - per-file isolated ID generator used for default group id
 * @returns Parsed props (variant, group)
 */
export function props(content: string, generateID: IDGenerator): TabsProps {
    const clean = trim(content.replace('list tabs', ''));

    const props = clean.split(' ');
    const result: TabsProps = {
        content: clean,
        variant: TabsVariants.Regular,
        // DEFAULT_TABS_GROUP_PREFIX ends with '-', so strip it before passing to generateID
        // which appends '-N' itself. Result: 'defaultTabsGroup-1', 'defaultTabsGroup-2', …
        // TabsController checks group.startsWith(DEFAULT_TABS_GROUP_PREFIX) which still matches.
        group: defaultTabsGroup(generateID),
    };

    visitProps(props, (key, value) => {
        switch (key) {
            case 'horizontal':
            case 'radio':
            case 'dropdown':
            case 'accordion':
                result.variant = key as TabsVariants;
                break;
            case 'group':
                result.group = unquote(value);
                break;
            default:
            // TODO: lint unknown tabs props
        }
    });

    return result;
}

function visitProps(
    parts: readonly string[],
    visit: (key: string, value: string, pieces: string[]) => void,
): void {
    for (const prop of parts) {
        const pieces = prop.split('=').map(trim);
        visit(pieces[0], pieces[1], pieces);
    }
}

export type TabsBoundary = {
    readonly map: readonly [number, number] | null;
    readonly raw: string;
} & (
    | {
          readonly kind: 'open';
          readonly variant:
              | {readonly present: false}
              | {readonly present: true; readonly raw: string};
          readonly group:
              | {readonly present: false}
              | {readonly present: true; readonly raw: string; readonly value: string};
      }
    | {readonly kind: 'close' | 'unsupported'}
);

/**
 * Classify one original block edge without pairing it or validating the body.
 * @param tokens - Original pre-semantic block tokens.
 * @param i - Candidate paragraph index.
 * @returns A copied boundary observation when recognized.
 */
export function recognizeTabsBoundary(
    tokens: readonly TabsBoundaryToken[],
    i: number,
): TabsBoundary | undefined {
    if (!tokens[i] || !tokens[i + 1]) return undefined;
    const match = matchOpenToken(tokens, i);
    const close = !match && matchCloseToken(tokens, i);
    if (!match && !close) return undefined;
    const map = tokens[i].map;
    const common = {map: map ? ([map[0], map[1]] as const) : null, raw: tokens[i + 1].content};
    if (close) return {kind: 'close', ...common};
    if (!match || (match[0].startsWith('`') && match[0].endsWith('`'))) return undefined;
    if (tokens[i + 1].content.trim() !== match[0]) return {kind: 'unsupported', ...common};
    let variant: {present: false} | {present: true; raw: string} = {present: false};
    let group: {present: false} | {present: true; raw: string; value: string} = {present: false};
    let unsupported = false;
    const parts = trim(match[0].replace('list tabs', '')).split(' ');
    visitProps(parts, (key, value, pieces) => {
        if ((!key || key === '{%' || key === '%}') && pieces.length === 1) return;
        if (
            ['horizontal', 'radio', 'dropdown', 'accordion'].includes(key) &&
            pieces.length === 1 &&
            !variant.present
        ) {
            variant = {present: true, raw: key};
        } else if (key === 'group' && pieces.length === 2 && value && !group.present) {
            group = {present: true, raw: value, value: unquote(value)};
        } else {
            unsupported = true;
        }
    });
    return unsupported
        ? {kind: 'unsupported', ...common}
        : {kind: 'open', ...common, variant, group};
}

type Result =
    | {step: number}
    | {
          content: string;
          closeTokenIndex: number;
          extraTokensAfterClose: number;
      };

/**
 * Check if tokens at index start a valid `{% list tabs %}` block.
 * @param tokens - Full token list
 * @param index - Start index
 * @returns Either a step to advance, or the block content and close index for replacement
 */
export function tryToFindTabs(tokens: Token[], index: number): Result {
    const match = matchOpenToken(tokens, index);
    const openTag = match && match[0];
    const isNotEscaped = openTag && !(openTag.startsWith('`') && openTag.endsWith('`'));

    if (!match || !isNotEscaped) {
        return {
            step: 1,
        };
    }

    const closeTokenIndex = findCloseTokenIndex(tokens, index + 3);

    if (!closeTokenIndex) {
        tokens[index].attrSet('YFM005', 'true');

        return {
            step: 3,
        };
    }

    let extraTokensAfterClose = 0;
    const afterEndlistIdx = closeTokenIndex + 3; // After paragraph_open, inline, paragraph_close

    const openTokenLevel = tokens[index].level;
    const closeTokenLevel = tokens[closeTokenIndex].level;

    // dont handle tabs if closeToken has "negative" indent, e.g. closeToken.level < openToken.level
    if (closeTokenLevel < openTokenLevel) {
        tokens[index].attrSet('YFM005', 'true');
        return {
            step: 3,
        };
    }

    if (closeTokenLevel > openTokenLevel) {
        const tokenAfter = tokens[afterEndlistIdx];

        // do not handle tabs unless {% endlist %} is at the end of the tab content
        if (tokenAfter && tokenAfter.nesting >= 0) {
            tokens[index].attrSet('YFM005', 'true');
            return {
                step: 3,
            };
        }

        // remove list close tokens if `{% endlist %}` is inside the content of a tab
        if (
            tokenAfter?.type === 'list_item_close' &&
            tokens[afterEndlistIdx + 1]?.type === 'bullet_list_close'
        ) {
            extraTokensAfterClose = 2;
        }
    }

    return {
        content: openTag,
        closeTokenIndex,
        extraTokensAfterClose,
    };
}

/**
 * Extract tab items (name + tokens) from list tokens between list open and close/endlist.
 * @param tokens - Full token list
 * @param idx - Index after list open
 * @param closeTokenIdx - Index of {% endlist %} paragraph
 * @param TokenConstructor - Token constructor from the current MarkdownIt state
 * @param end - Exclusive scan bound
 * @returns Array of RuntimeTab
 */
export function findTabs(
    tokens: Token[],
    idx: number,
    closeTokenIdx: number,
    TokenConstructor: StateCore['Token'],
    end: number,
): RuntimeTab[] {
    const tabs: RuntimeTab[] = [];
    let i = idx;
    let nestedLevel = -1;
    let pending: RuntimeTab = {
        name: '',
        tokens: [],
        listItem: new TokenConstructor('list_item_open', '', 0),
    };

    while (i < end) {
        const token = tokens[i];

        switch (token.type) {
            case 'ordered_list_open':
            case 'bullet_list_open':
                if (nestedLevel > -1) {
                    pending.tokens.push(token);
                }

                nestedLevel++;

                break;
            case 'list_item_open':
                if (nestedLevel) {
                    pending.tokens.push(token);
                } else {
                    pending = {name: '', tokens: [], listItem: token};
                }

                break;
            case 'list_item_close':
                if (nestedLevel) {
                    pending.tokens.push(token);
                } else {
                    tabs.push(pending);
                }

                break;
            case 'ordered_list_close':
            case 'bullet_list_close':
                // The tab list may be interrupted by a dedented block (e.g. a heading)
                // and continue as a new list before {% endlist %}. Keep collecting until
                // {% endlist %}, otherwise transform() would drop everything in between.
                if (nestedLevel) {
                    pending.tokens.push(token);
                }

                nestedLevel--;

                break;
            case 'paragraph_open':
                if (
                    i === closeTokenIdx &&
                    tokens[i + 1].content &&
                    tokens[i + 1].content.trim() === '{% endlist %}'
                ) {
                    if (pending && !nestedLevel) {
                        tabs.push(pending);
                    }

                    return tabs;
                }

                if (!pending.name && tokens[i + 1].type === 'inline') {
                    pending.name = tokens[i + 1].content;

                    i += 2;
                } else {
                    pending.tokens.push(token);
                }
                break;
            default:
                pending.tokens.push(token);
        }
        i++;
    }

    return tabs;
}
