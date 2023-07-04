import {useEffect, useState} from 'react';
import {SELECT_TAB_EVENT_NAME, SelectedTabEvent, Tab} from '../common';

export function useDiplodocTabs(group: string) {
    const isBrowser = typeof window !== 'undefined';
    const [selectedTab, setSelectedTab] = useState<Tab | null>(null);

    function selectTabHandle(event: Event) {
        const {tab} = (event as CustomEvent<SelectedTabEvent>).detail;
        if (tab.group === group) {
            setSelectedTab(tab);
        }
    }

    useEffect(() => {
        if (isBrowser) {
            window.diplodocTabs.addEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
        }
        return () => {
            if (isBrowser) {
                window.diplodocTabs.removeEventListener(SELECT_TAB_EVENT_NAME, selectTabHandle);
            }
        };
    }, []);

    return [
        selectedTab,
        (key: string) => {
            if (isBrowser) {
                window.diplodocTabs.selectTab({group, key});
            }
        },
    ];
}
