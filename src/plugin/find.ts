import Token from 'markdown-it/lib/token';

import {DEFAULT_TABS_GROUP_PREFIX, TAB_RE, TabsVariants} from '../common';

import {RuntimeTab, TabsProps} from './types';
import {generateID, trim, unquote} from './utils';

function findCloseTokenIndex(tokens: Token[], idx: number) {
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

function matchCloseToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.trim() === '{% endlist %}'
    );
}

function matchOpenToken(tokens: Token[], i: number) {
    return (
        tokens[i].type === 'paragraph_open' &&
        tokens[i + 1].type === 'inline' &&
        tokens[i + 1].content.match(TAB_RE)
    );
}

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
    | {
          step: number;
      }
    | {
          content: string;
          closeTokenIndex: number;
      };

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

    return {
        content: openTag,
        closeTokenIndex,
    };
}

export function findTabs(tokens: Token[], idx: number, closeTokenIdx: number) {
    const tabs = [];
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
