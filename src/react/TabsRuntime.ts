import {useEffect} from 'react';

import {TabsControllerOptions} from '../runtime/TabsController';

import {useDiplodocTabs} from './useDiplodocTabs';

export function TabsRuntime(props: Partial<TabsControllerOptions> & {router?: object} = {}) {
    if (typeof window === 'undefined') {
        return null;
    }

    const tabs = useDiplodocTabs();

    useEffect(() => {
        tabs.configure({...props});
    }, [props, tabs]);

    useEffect(() => {
        tabs.onPageChanged();
        tabs.restoreTabs({
            ...tabs.getTabsFromLocalStorage(),
            ...tabs.getTabsFromSearchQuery(),
        });
    }, [props.router]);

    return null;
}
