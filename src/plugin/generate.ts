import type StateCore from 'markdown-it/lib/rules_core/state_core';

import {RuntimeTab} from './types';
import {generateTokensByType} from './variants';
import {TabsGenerationProps} from './variants/types';

export function generateTabsTokens(
    tabs: RuntimeTab[],
    state: StateCore,
    props: TabsGenerationProps,
) {
    const tokens = generateTokensByType(props.orientation)(tabs, state, props);

    return tokens;
}
