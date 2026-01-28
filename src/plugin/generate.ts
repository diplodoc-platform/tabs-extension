import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type {RuntimeTab} from './types';
import type {TabsGenerationProps} from './variants/types';

import {generateTokensByType} from './variants';

export function generateTabsTokens(
    tabs: RuntimeTab[],
    state: StateCore,
    props: TabsGenerationProps,
) {
    const tokens = generateTokensByType(props.variant)(tabs, state, props);

    return tokens;
}
