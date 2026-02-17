/**
 * Parsing of `{% list tabs %}` blocks: locate open/close tags, parse props, and extract tab items
 * from the list tokens between them.
 */
import type {RuntimeTab, TabsProps} from './types';

import Token from 'markdown-it/lib/token';

import {DEFAULT_TABS_GROUP_PREFIX, TAB_RE, TabsVariants} from '../common';

import {generateID, trim, unquote} from './utils';

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

function matchCloseToken(tokens: Token[], i: number): boolean {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endlist %}'
    );
}

function matchOpenToken(tokens: Token[], i: number): RegExpMatchArray | null {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(TAB_RE)
    );
}

/**
 * Parse `{% list tabs group=... %}` content into variant and group id.
 * @param content - Raw tag content after "list tabs"
 * @returns Parsed props (variant, group)
 */
export function props(content: string): TabsProps {
    const clean = trim(content.replace('list tabs', ''));

    const props = clean.split(' ');
    const result: TabsProps = {
        content: clean,
        variant: TabsVariants.Regular,
        group: `${DEFAULT_TABS_GROUP_PREFIX}${generateID()}`,
    };

    for (const prop of props) {
        const [key, value] = prop.split('=').map(trim);

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
    }

    return result;
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
 * @returns Array of RuntimeTab
 */
export function findTabs(tokens: Token[], idx: number, closeTokenIdx: number): RuntimeTab[] {
    const tabs: RuntimeTab[] = [];
    let i = idx;
    let nestedLevel = -1;
    let pending: RuntimeTab = {
        name: '',
        tokens: [],
        listItem: new Token('list_item_open', '', 0),
    };

    while (i < tokens.length) {
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
                if (!nestedLevel) {
                    return tabs;
                }

                nestedLevel--;

                pending.tokens.push(token);

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
