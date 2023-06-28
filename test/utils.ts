/* eslint-disable no-implicit-globals */
import Token from 'markdown-it/lib/token';
import MarkdownIt from 'markdown-it';
import StateCore from 'markdown-it/lib/rules_core/state_core';
import type {
    MarkdownItPluginCb,
    MarkdownItPluginOpts,
} from '@doc-tools/transform/lib/plugins/typings';

const md = new MarkdownIt();

export function callPlugin<T extends {}>(
    plugin: MarkdownItPluginCb<T>,
    tokens: Token[],
    opts?: Partial<MarkdownItPluginOpts & T>,
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
            opts as MarkdownItPluginOpts & T,
        ),
    );

    return state;
}

export const tokenize = (lines: string[] = []) => md.parse(lines.join('\n'), {});
