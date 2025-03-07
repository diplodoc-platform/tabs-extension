import {useEffect} from 'react';

import {TabsControllerOptions} from '../runtime/TabsController';

import {useDiplodocTabs} from './useDiplodocTabs';

export function TabsRuntime(props: Partial<TabsControllerOptions> = {}) {
    const tabs = useDiplodocTabs();
    tabs.configure({...props});

    useEffect(() => {
        tabs.onPageChanged();
        tabs.restoreTabs({
            ...tabs.getTabsFromLocalStorage(),
            ...tabs.getTabsFromSearchQuery(),
        });
    }, [tabs]);

    return null;
}
