/* eslint-disable no-implicit-globals */
import type StateCore from 'markdown-it/lib/rules_core/state_core';

import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';

const md = new MarkdownIt();

export function callPlugin<T extends {}>(
    plugin: (md: MarkdownIt, opts: Partial<T>) => void,
    tokens: Token[],
    opts?: Partial<T>,
) {
    md.disable = () => md;
    md.enable = () => md;

    const state = {
        tokens,
        env: {},
        Token,
        md,
    } as StateCore;

    const fakeMd = {
        core: {
            ruler: {
                push: (_name: unknown, cb: (s: StateCore) => void) => cb(state),
                before: (_anotherPlugin: unknown, _name: unknown, cb: (s: StateCore) => void) =>
                    cb(state),
            },
        },
    } as MarkdownIt;

    plugin(
        fakeMd,
        Object.assign(
            {
                path: '',
                lang: 'ru',
                root: '',
            },
            opts as T,
        ),
    );

    return state;
}

export const tokenize = (content: string | string[] = []) =>
    md.parse(typeof content === 'string' ? content : content.join('\n'), {});
