/**
 * React component that configures the global TabsController and restores tab state from
 * localStorage + URL on mount (and when router changes). Renders nothing (return null).
 */
import type {TabsControllerOptions} from '../runtime/TabsController';

import {useEffect} from 'react';

import {useDiplodocTabs} from './useDiplodocTabs';

/**
 * Mount once (e.g. in layout) to apply options and restore tabs from storage/URL.
 * Pass router so that restore runs again on route change.
 * @param props - Controller options and optional router
 * @returns null (component renders nothing)
 */
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
