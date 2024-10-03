import type Token from 'markdown-it/lib/token';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import type {RuntimeTab, TabsOrientation} from '../types';

export type TokensRange = {
    start: number;
    end: number;
};

export type TabsGenerationProps = {
    containerClasses: string;
    tabsGroup: string;
    runId: string;
    orientation: TabsOrientation;
};

export type TabsTokensGenerator = (
    tabs: RuntimeTab[],
    state: StateCore,
    props: TabsGenerationProps,
) => Token[];
