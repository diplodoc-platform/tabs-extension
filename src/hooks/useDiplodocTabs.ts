import {useEffect, useRef} from 'react';
import {SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';

export {Tab};
export type UseDiplodocTabsCallback = (currentTabId: string) => void;

export function useDiplodocTabs(callback: UseDiplodocTabsCallback) {
    const callbackRef = useRef<UseDiplodocTabsCallback>();

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    function selectTabHandle(event: Event) {
        const {currentTabId} = (event as CustomEvent<SelectedTabEvent>).detail;
        callbackRef.current?.(currentTabId);
    }

    useEffect(() => {
        window.diplodocTabs.addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        return () => {
            window.diplodocTabs.removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        };
    }, []);

    return {
        selectTabById: (id: string) => window.diplodocTabs.selectTabById(id),
    };
}
