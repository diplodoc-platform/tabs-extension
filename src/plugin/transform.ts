import type {
    BlockContentState,
    DirectiveBlockState,
    DirectiveInlineState,
    DirectiveParserHost,
} from '@diplodoc/directive';
/**
 * MarkdownIt plugin: finds `{% list tabs %}` blocks, parses tab items, and replaces them
 * with HTML tokens for the chosen variant. Registers runtime script/style in env.meta.
 */
import type {IDGenerator} from '@diplodoc/utils';
import type {EnabledVariants} from '../common';
import type {TabsDirectiveDiagnostic, TabsMarker} from './directive';
import type {MarkdownIt, StateCore, Token} from './markdown-it';

import {createIDGeneratorByStrategy} from '@diplodoc/utils';

import {TabsVariants} from '../common';

import {addHiddenProperty} from './utils';
import {generateTabsTokens} from './generate';
import {defaultTabsGroup, findTabs, props, tryToFindTabs} from './find';
import {installTabsDirective, validateTabsMarkers} from './directive';

/** Options for the tabs plugin (paths, container classes, enabled variants). */
export type PluginOptions = {
    runtimeJsPath: string;
    runtimeCssPath: string;
    containerClasses: string;
    bundle: boolean;
    directiveSyntax?: 'disabled' | 'enabled' | 'only';
    onDiagnostic?: (diagnostic: TabsDirectiveDiagnostic) => void;
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
export type TabsDirectivePlugin = <
    B extends DirectiveBlockState & BlockContentState<B>,
    I extends DirectiveInlineState,
>(
    md: MarkdownIt & DirectiveParserHost<B, I>,
    options?: TransformOptions,
) => void;

function appendRuntimeMeta(
    env: Record<string | symbol, unknown>,
    runtimeJsPath: string,
    runtimeCssPath: string,
) {
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
}

type TabsMatch =
    | {step: number}
    | {
          close: number;
          bodyStart: number;
          removeCount: number;
          end: number;
          variant: TabsVariants;
          group: string;
      };

function matchTabs(
    tokens: Token[],
    start: number,
    markers: WeakMap<object, TabsMarker>,
    legacy: boolean,
    generateID: IDGenerator,
): TabsMatch {
    const marker = markers.get(tokens[start]);
    if (marker?.kind === 'close') throw new Error('Unexpected tabs directive closing marker');
    if (marker) {
        const close = tokens.findIndex((token, index) => index > start && token === marker.end);
        if (close < 0) throw new Error('Tabs directive closing marker is missing');
        const defaultGroup = defaultTabsGroup(generateID);
        return {
            close,
            bodyStart: start + 1,
            removeCount: close - start + 1,
            end: close,
            variant: marker.variant,
            group: marker.group ?? defaultGroup,
        };
    }
    if (!legacy) return {step: 1};
    const result = tryToFindTabs(tokens, start);
    if ('step' in result) return result;
    const parsed = props(result.content, generateID);
    return {
        close: result.closeTokenIndex,
        bodyStart: start + 3,
        removeCount: result.closeTokenIndex - start + 3 + result.extraTokensAfterClose,
        end: tokens.length,
        variant: parsed.variant,
        group: parsed.group,
    };
}

/**
 * Returns a MarkdownIt plugin that transforms `{% list tabs %}` blocks into tab markup.
 * @param options - Paths for runtime JS/CSS, container classes, and enabled variants
 * @returns Plugin function that receives (md, options) and registers the core ruler
 */
export function transform(
    options?: Partial<PluginOptions> & {directiveSyntax?: 'disabled'},
): TabsPlugin;
export function transform(
    options: Partial<PluginOptions> & {directiveSyntax: 'enabled' | 'only'},
): TabsDirectivePlugin;
export function transform(options: Partial<PluginOptions>): TabsDirectivePlugin;
export function transform(options: Partial<PluginOptions> = {}): TabsPlugin | TabsDirectivePlugin {
    const {
        runtimeJsPath = '_assets/tabs-extension.js',
        runtimeCssPath = '_assets/tabs-extension.css',
        containerClasses = '',
        bundle = true,
        features = defaultFeatures,
        onBundle,
        directiveSyntax = 'disabled',
        onDiagnostic,
    } = options;

    function installCore(
        md: MarkdownIt,
        options: TransformOptions | undefined,
        markers: WeakMap<object, TabsMarker>,
        legacy: boolean,
    ) {
        const {output = '.', generateID: externalGenerateID} = options || {};

        // Use the external ID generator if provided (e.g. from MarkdownItPluginOpts.generateID),
        // otherwise create a random fallback for standalone usage.
        // The fallback is created once per md.use() call, so it's shared across all parse() calls
        // on the same md instance (including recursive calls from includes plugins).
        const generateID: IDGenerator =
            externalGenerateID ?? (createIDGeneratorByStrategy('random') as IDGenerator);

        const plugin = (state: StateCore) => {
            const {tokens} = state;
            validateTabsMarkers(tokens, markers);
            const env = addHiddenProperty(state.env, 'bundled', new Set<string>());
            const runId = String(++runsCounter);

            let i = 0;
            let tabsAreInserted = false;

            while (i < tokens.length) {
                const match = matchTabs(tokens, i, markers, legacy, generateID);
                if ('step' in match) {
                    i += match.step;
                    continue;
                }
                const variant = features.enabledVariants[match.variant]
                    ? match.variant
                    : TabsVariants.Regular;
                const tabs = findTabs(
                    state.tokens,
                    match.bodyStart,
                    match.close,
                    state.Token,
                    match.end,
                );

                if (tabs.length > 0) {
                    const tabsTokens = generateTabsTokens(tabs, state, {
                        containerClasses,
                        tabsGroup: match.group,
                        variant,
                        runId,
                        generateID,
                    });

                    // Remove tokens including any list closing tokens after endlist
                    state.tokens.splice(i, match.removeCount, ...tabsTokens);

                    i++;
                    tabsAreInserted = true;
                } else {
                    state.tokens.splice(i, match.removeCount);
                }
            }

            if (tabsAreInserted) {
                appendRuntimeMeta(env, runtimeJsPath, runtimeCssPath);

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
    }
    function legacyPlugin(md: MarkdownIt, settings?: TransformOptions): void {
        installCore(md, settings, new WeakMap(), true);
    }
    function directivePlugin<
        B extends DirectiveBlockState & BlockContentState<B>,
        I extends DirectiveInlineState,
    >(md: MarkdownIt & DirectiveParserHost<B, I>, settings?: TransformOptions): void {
        const markers = new WeakMap<object, TabsMarker>();
        installTabsDirective(md, markers, onDiagnostic);
        installCore(md, settings, markers, directiveSyntax === 'enabled');
    }
    return directiveSyntax === 'disabled' ? legacyPlugin : directivePlugin;
}
