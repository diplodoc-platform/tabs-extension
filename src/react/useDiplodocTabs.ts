import {useEffect, useRef, useCallback} from 'react';
import {GLOBAL_SYMBOL, SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';
import {ISelectTabByIdOptions} from '../runtime/TabsController';

export {Tab};

export type UseDiplodocTabsCallback = (tab: Tab, currentTabId?: string) => void;

export function useDiplodocTabs(callback: UseDiplodocTabsCallback) {
    const callbackRef = useRef<UseDiplodocTabsCallback>();

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    function selectTabHandle(event: Event) {
        const {tab, currentTabId} = (event as CustomEvent<SelectedTabEvent>).detail;
        callbackRef.current?.(tab, currentTabId);
    }

    useEffect(() => {
        window[GLOBAL_SYMBOL].addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        return () => {
            window[GLOBAL_SYMBOL].removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        };
    }, []);

    return {
        selectTabById: useCallback(
            (tabId: string, options?: ISelectTabByIdOptions) =>
                window[GLOBAL_SYMBOL].selectTabById(tabId, options),
            [],
        ),
        selectTab: useCallback((tab: Tab) => window[GLOBAL_SYMBOL].selectTab(tab), []),
    };
}
