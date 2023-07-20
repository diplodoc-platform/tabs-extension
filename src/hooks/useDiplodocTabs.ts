import {useEffect, useRef, useCallback} from 'react';
import {SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';
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
        window.diplodocTabs.addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        return () => {
            window.diplodocTabs.removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        };
    }, []);

    return {
        selectTabById: useCallback(
            (tabId: string, options?: ISelectTabByIdOptions) =>
                window.diplodocTabs.selectTabById(tabId, options),
            [],
        ),
        selectTab: useCallback((tab: Tab) => window.diplodocTabs.selectTab(tab), []),
        reset: useCallback(() => window.diplodocTabs.reset(), []),
    };
}
