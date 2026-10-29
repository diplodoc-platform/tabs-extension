import type {MarkdownIt, StateCore} from './markdown-it';
/**
 * MarkdownIt plugin: finds `{% list tabs %}` blocks, parses tab items, and replaces them
 * with HTML tokens for the chosen variant. Registers runtime script/style in env.meta.
 */
import type {IDGenerator} from '@diplodoc/utils';
import type {EnabledVariants} from '../common';

import {createIDGeneratorByStrategy} from '@diplodoc/utils';

import {TabsVariants} from '../common';

import {addHiddenProperty} from './utils';
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
    /** @internal */
    onBundle?: (
        args: {runtimeJsPath: string; runtimeCssPath: string; output: string},
        cache: Set<string>,
    ) => void;
};

const defaultFeatures: PluginOptions['features'] = {
    enabledVariants: {
        regular: true,
        radio: true,
    },
};

let runsCounter = 0;

export type TransformOptions = {
    output?: string;
    /** Optional external ID generator provided by the host (e.g. via MarkdownItPluginOpts). */
    generateID?: IDGenerator;
};

/** The plugin callback returned by transform. */
export type TabsPlugin = (md: MarkdownIt, options?: TransformOptions) => void;

/**
 * Returns a MarkdownIt plugin that transforms `{% list tabs %}` blocks into tab markup.
 * @param options - Paths for runtime JS/CSS, container classes, and enabled variants
 * @returns Plugin function that receives (md, options) and registers the core ruler
 */
export function transform(options: Partial<PluginOptions> = {}): TabsPlugin {
    const {
        runtimeJsPath = '_assets/tabs-extension.js',
        runtimeCssPath = '_assets/tabs-extension.css',
        containerClasses = '',
        bundle = true,
        features = defaultFeatures,
        onBundle,
    } = options;

    return function tabs(md: MarkdownIt, options?: TransformOptions) {
        const {output = '.', generateID: externalGenerateID} = options || {};

        // Use the external ID generator if provided (e.g. from MarkdownItPluginOpts.generateID),
        // otherwise create a random fallback for standalone usage.
        // The fallback is created once per md.use() call, so it's shared across all parse() calls
        // on the same md instance (including recursive calls from includes plugins).
        const generateID: IDGenerator =
            externalGenerateID ?? (createIDGeneratorByStrategy('random') as IDGenerator);

        const plugin = (state: StateCore) => {
            const {tokens} = state;
            const env = addHiddenProperty(state.env, 'bundled', new Set<string>());
            const runId = String(++runsCounter);

            let i = 0;
            let tabsAreInserted = false;

            while (i < tokens.length) {
                const result = tryToFindTabs(tokens, i);

                if ('step' in result) {
                    i += result.step;

                    continue;
                }

                const {content, closeTokenIndex, extraTokensAfterClose} = result;

                const parsedProps = props(content, generateID);

                if (!features.enabledVariants[parsedProps.variant]) {
                    parsedProps.variant = TabsVariants.Regular;
                }

                const tabs = findTabs(state.tokens, i + 3, closeTokenIndex, state.Token);

                if (tabs.length > 0) {
                    const tabsTokens = generateTabsTokens(tabs, state, {
                        containerClasses,
                        tabsGroup: parsedProps.group,
                        variant: parsedProps.variant,
                        runId,
                        generateID,
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
                const meta = (env.meta ||= {});
                if (typeof meta !== 'object' || meta === null) {
                    throw new TypeError('Expected env.meta to be an object.');
                }
                if (!('script' in meta) || !meta.script) Object.assign(meta, {script: []});
                if (!('style' in meta) || !meta.style) Object.assign(meta, {style: []});
                if (
                    !('script' in meta) ||
                    !Array.isArray(meta.script) ||
                    !('style' in meta) ||
                    !Array.isArray(meta.style)
                ) {
                    throw new TypeError('Expected runtime script and style arrays.');
                }
                meta.script.push(runtimeJsPath);
                meta.style.push(runtimeCssPath);

                if (bundle && onBundle) {
                    onBundle({runtimeJsPath, runtimeCssPath, output}, env.bundled);
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
