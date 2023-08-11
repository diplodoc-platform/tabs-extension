import {useEffect, useCallback} from 'react';
import {GLOBAL_SYMBOL, SelectedTabEvent, Tab} from '../common';
import {ISelectTabByIdOptions} from '../runtime/TabsController';

export {Tab};

export type UseDiplodocTabsCallback = (tab: Tab, currentTabId?: string) => void;

export function useDiplodocTabs(callback: UseDiplodocTabsCallback) {
    const selectTabHandle = useCallback(
        ({tab, currentTabId}: SelectedTabEvent) => {
            callback(tab, currentTabId);
        },
        [callback],
    );

    useEffect(() => window[GLOBAL_SYMBOL].onSelectTab(selectTabHandle), [selectTabHandle]);

    return {
        selectTabById: useCallback(
            (tabId: string, options?: ISelectTabByIdOptions) =>
                window[GLOBAL_SYMBOL].selectTabById(tabId, options),
            [],
        ),
        selectTab: useCallback((tab: Tab) => window[GLOBAL_SYMBOL].selectTab(tab), []),
    };
}
