import {useCallback, useEffect} from 'react';

import {GLOBAL_SYMBOL, SelectedTabEvent, Tab} from '../common';
import {ISelectTabByIdOptions, TabsControllerOptions, TabsHistory} from '../runtime/TabsController';

export type {Tab};

export type UseDiplodocTabsCallback = (tab: Tab, currentTabId?: string) => void;

export function useDiplodocTabs(callback: UseDiplodocTabsCallback | undefined = undefined) {
    if (callback !== undefined) {
        const selectTabHandle = useCallback(
            ({tab, currentTabId}: SelectedTabEvent) => {
                callback(tab, currentTabId);
            },
            [callback],
        );

        useEffect(() => window[GLOBAL_SYMBOL].onSelectTab(selectTabHandle), [selectTabHandle]);
    }

    return {
        selectTabById: useCallback(
            (tabId: string, options?: ISelectTabByIdOptions) =>
                window[GLOBAL_SYMBOL].selectTabById(tabId, options),
            [],
        ),
        selectTab: useCallback((tab: Tab) => window[GLOBAL_SYMBOL].selectTab(tab), []),
        configure: useCallback(
            (options: Partial<TabsControllerOptions>) => window[GLOBAL_SYMBOL].configure(options),
            [],
        ),
        restoreTabsPreferred: useCallback(
            (tabsHistory: TabsHistory | undefined = undefined) =>
                window[GLOBAL_SYMBOL].restoreTabsPreferred(tabsHistory),
            [],
        ),
        updateLocalStorageWithTabs: useCallback(
            (tabsHistory: TabsHistory) =>
                window[GLOBAL_SYMBOL].updateLocalStorageWithTabs(tabsHistory),
            [],
        ),
        updateQueryParamWithTabs: useCallback(
            (tabsHistory: TabsHistory) =>
                window[GLOBAL_SYMBOL].updateQueryParamWithTabs(tabsHistory),
            [],
        ),
    };
}
