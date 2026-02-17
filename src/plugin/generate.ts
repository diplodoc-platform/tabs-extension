import type Token from 'markdown-it/lib/token';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type {RuntimeTab} from './types';
import type {TabsGenerationProps} from './variants/types';

import {generateTokensByType} from './variants';

/**
 * Generate markdown-it tokens for a tabs block based on the chosen variant.
 * Delegates to the variant-specific generator (regular, radio, dropdown, accordion).
 * @param tabs - Parsed tab items
 * @param state - MarkdownIt state
 * @param props - Generation options (containerClasses, tabsGroup, runId, variant)
 * @returns Token array for the block
 */
export function generateTabsTokens(
    tabs: RuntimeTab[],
    state: StateCore,
    props: TabsGenerationProps,
): Token[] {
    const tokens = generateTokensByType(props.variant)(tabs, state, props);

    return tokens;
}
