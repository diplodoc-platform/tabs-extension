import {useEffect, useState} from 'react';
import {SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';

export function useDiplodocTabs() {
    const [selectedTab, setSelectedTab] = useState<Tab | null>(window.diplodocTabs.selectedTab);

    function selectTabHandle(event: Event) {
        const {tab} = (event as CustomEvent<SelectedTabEvent>).detail;
        setSelectedTab(tab);
    }

    useEffect(() => {
        window.diplodocTabs.addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);

        return () => {
            window.diplodocTabs.removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        };
    }, []);

    return [
        selectedTab,
        (tab: Tab) => {
            window.diplodocTabs.selectTab(tab);
        },
    ];
}
