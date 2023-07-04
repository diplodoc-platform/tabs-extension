import {useEffect, useState} from 'react';
import {SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';

export function useDiplodocTabs(group: string) {
    const [selectedTab, setSelectedTab] = useState<Tab | null>(window.diplodocTabs.selectedTab);

    function selectTabHandle(event: Event) {
        const {tab} = (event as CustomEvent<SelectedTabEvent>).detail;
        if (tab.group === group) {
            setSelectedTab(tab);
        }
    }

    useEffect(() => {
        window.diplodocTabs.addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);

        return () => {
            window.diplodocTabs.removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        };
    }, []);

    return [
        selectedTab,
        (key: string) => {
            window.diplodocTabs.selectTab({group, key});
        },
    ];
}
