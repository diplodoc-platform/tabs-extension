import {useEffect, useRef} from 'react';
import {SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';

export {Tab};
export type UseDiplodocTabsCallback = (tab: Tab) => void;

export function useDiplodocTabs(callback: UseDiplodocTabsCallback) {
    const callbackRef = useRef<UseDiplodocTabsCallback>();

    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    function selectTabHandle(event: Event) {
        const {tab} = (event as CustomEvent<SelectedTabEvent>).detail;
        callbackRef.current?.(tab);
    }

    useEffect(() => {
        window.diplodocTabs.addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        return () => {
            window.diplodocTabs.removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        };
    }, []);

    return (tab: Tab) => {
        window.diplodocTabs.selectTab(tab);
    };
}
