/**
 * React hook to access the global TabsController (window[GLOBAL_SYMBOL]).
 * Optionally subscribe to tab switch events via callback. Returns controller methods in stable refs.
 */
import type {SelectedTabEvent, Tab} from '../common';
import type {
    ISelectTabByIdOptions,
    TabsControllerOptions,
    TabsHistory,
} from '../runtime/TabsController';

import {useCallback, useEffect} from 'react';

import {GLOBAL_SYMBOL} from '../common';

export type {Tab};

/** Called when user (or code) switches to another tab; receives tab descriptor and optional element id. */
export type UseDiplodocTabsCallback = (tab: Tab, currentTabId?: string) => void;

/**
 * Access tabs API and optionally listen to tab switch events.
 * @param callback - If provided, called on each tab switch (tab, currentTabId).
 * @returns Object with selectTabById, selectTab, configure, restoreTabs, onPageChanged, and persistence helpers.
 */
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
        restoreTabs: useCallback(
            (tabsHistory: TabsHistory) => window[GLOBAL_SYMBOL].restoreTabs(tabsHistory),
            [],
        ),
        onPageChanged: useCallback(() => window[GLOBAL_SYMBOL].onPageChanged(), []),
        getTabsFromLocalStorage: useCallback(
            () => window[GLOBAL_SYMBOL].getTabsFromLocalStorage(),
            [],
        ),
        getTabsFromSearchQuery: useCallback(
            () => window[GLOBAL_SYMBOL].getTabsFromSearchQuery(),
            [],
        ),
        getCurrentPageTabHistory: useCallback(
            (tabsHistory: TabsHistory) =>
                window[GLOBAL_SYMBOL].getCurrentPageTabHistory(tabsHistory),
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
