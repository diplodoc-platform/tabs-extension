/**
 * MarkdownIt plugin: finds `{% list tabs %}` blocks, parses tab items, and replaces them
 * with HTML tokens for the chosen variant. Registers runtime script/style in env.meta.
 */
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type MarkdownIt from 'markdown-it';
import type {EnabledVariants} from '../common';

import {TabsVariants} from '../common';

import {addHiddenProperty, copyRuntimeFiles} from './utils';
import {generateTabsTokens} from './generate';
import {findTabs, props, tryToFindTabs} from './find';

/** Options for the tabs plugin (paths, container classes, enabled variants). */
export type PluginOptions = {
    runtimeJsPath: string;
    runtimeCssPath: string;
    containerClasses: string;
    bundle: boolean;
    features: {
        enabledVariants: EnabledVariants;
    };
};

const defaultFeatures = {
    enabledVariants: {
        regular: true,
        radio: true,
    },
} satisfies PluginOptions['features'];

let runsCounter = 0;

type TransformOptions = {
    output?: string;
};

/**
 * Returns a MarkdownIt plugin that transforms `{% list tabs %}` blocks into tab markup.
 * @param options - Paths for runtime JS/CSS, container classes, and enabled variants
 * @returns Plugin function that receives (md, options) and registers the core ruler
 */
export function transform({
    runtimeJsPath = '_assets/tabs-extension.js',
    runtimeCssPath = '_assets/tabs-extension.css',
    containerClasses = '',
    bundle = true,
    features = defaultFeatures,
}: Partial<PluginOptions> = {}) {
    return function tabs(md: MarkdownIt, options?: TransformOptions) {
        const {output = '.'} = options || {};
        const plugin = (state: StateCore) => {
            const {env, tokens} = state;
            const runId = String(++runsCounter);

            addHiddenProperty(env, 'bundled', new Set<string>());

            let i = 0;
            let tabsAreInserted = false;

            while (i < tokens.length) {
                const result = tryToFindTabs(tokens, i);

                if ('step' in result) {
                    i += result.step;

                    continue;
                }

                const {content, closeTokenIndex, extraTokensAfterClose} = result;

                const parsedProps = props(content);

                if (!features.enabledVariants[parsedProps.variant]) {
                    parsedProps.variant = TabsVariants.Regular;
                }

                const tabs = findTabs(state.tokens, i + 3, closeTokenIndex);

                if (tabs.length > 0) {
                    const tabsTokens = generateTabsTokens(tabs, state, {
                        containerClasses,
                        tabsGroup: parsedProps.group,
                        variant: parsedProps.variant,
                        runId,
                    });

                    // Remove tokens including any list closing tokens after endlist
                    state.tokens.splice(
                        i,
                        closeTokenIndex - i + 3 + extraTokensAfterClose,
                        ...tabsTokens,
                    );

                    i++;
                    tabsAreInserted = true;
                } else {
                    state.tokens.splice(i, closeTokenIndex - i + 3 + extraTokensAfterClose);
                }
            }

            if (tabsAreInserted) {
                env.meta = env.meta || {};
                env.meta.script = env.meta.script || [];
                env.meta.style = env.meta.style || [];
                env.meta.script.push(runtimeJsPath);
                env.meta.style.push(runtimeCssPath);

                if (bundle) {
                    copyRuntimeFiles({runtimeJsPath, runtimeCssPath, output}, env.bundled);
                }
            }
        };

        try {
            md.core.ruler.before('curly_attributes', 'tabs', plugin);
        } catch {
            md.core.ruler.push('tabs', plugin);
        }
    };
}
