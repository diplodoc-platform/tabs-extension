/* eslint-disable no-implicit-globals */
import Token from 'markdown-it/lib/token';
import MarkdownIt from 'markdown-it';
import StateCore from 'markdown-it/lib/rules_core/state_core';

import type {PluginOptions} from '../src/plugin/transform';
import {transform as tabsTransform} from '../src/plugin/transform';

const md = new MarkdownIt();

const defaultPluginFeatures = {
    enabledVariants: {radio: true, regular: true} as PluginOptions['features']['enabledVariants'],
};

/** Render markdown to HTML using MarkdownIt + tabs plugin (no @diplodoc/transform). */
export function renderWithTabsPlugin(
    content: string | string[],
    pluginOpts?: Partial<PluginOptions>,
): string {
    const mdForRender = new MarkdownIt();
    const pluginFn = tabsTransform({
        bundle: false,
        features: {
            enabledVariants: {
                ...defaultPluginFeatures.enabledVariants,
                ...pluginOpts?.features?.enabledVariants,
            },
        },
        ...pluginOpts,
    });
    pluginFn(mdForRender);
    const text = typeof content === 'string' ? content : content.join('\n');
    return mdForRender.render(text);
}

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
