import type Token from 'markdown-it/lib/token';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type {RuntimeTab} from '../types';
import type {TabsVariants} from '../../common';

/** Source map line range for a token block. */
export type TokensRange = {
    start: number;
    end: number;
};

/** Input passed to each variant's token generator. */
export type TabsGenerationProps = {
    containerClasses: string;
    tabsGroup: string;
    runId: string;
    variant: TabsVariants;
};

/** Function that turns parsed RuntimeTab[] + state into markdown-it tokens for one variant. */
export type TabsTokensGenerator = (
    tabs: RuntimeTab[],
    state: StateCore,
    props: TabsGenerationProps,
) => Token[];
