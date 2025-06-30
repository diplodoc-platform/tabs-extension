import type StateCore from 'markdown-it/lib/rules_core/state_core';

import {
    GROUP_DATA_KEY,
    TABS_ACCORDION_CLASSNAME,
    TABS_CLASSNAME,
    TAB_ACCORDION_CLASSNAME,
    TAB_ACCORDION_CONTENT_CLASSNAME,
    TAB_ACCORDION_TITLE_CLASSNAME,
    TAB_DATA_KEY,
    TAB_DATA_VARIANT,
    TabsVariants,
} from '../../common';
import {getName, getTabKey, isTabSelected} from '../utils';
import {type RuntimeTab} from '../types';

import {type TabsTokensGenerator} from './types';

export const accordion: TabsTokensGenerator = (
    tabs: RuntimeTab[],
    state: StateCore,
    {containerClasses, tabsGroup},
) => {
    const tabsTokens = [];
    const tabsOpen = new state.Token('tabs_open', 'div', 1);
    const tabsClose = new state.Token('tabs_close', 'div', -1);

    if (tabs.length) {
        const [start] = tabs[0].listItem.map ?? [null];
        // eslint-disable-next-line no-eq-null, eqeqeq
        if (start == null) {
            throw new Error('failed to parse line mapping');
        }

        const [_, end] = tabs[tabs.length - 1].listItem.map ?? [null, null];
        // eslint-disable-next-line no-eq-null, eqeqeq
        if (end == null) {
            throw new Error('failed to parse line mapping');
        }
    }

    tabsOpen.block = true;
    tabsClose.block = true;

    const activeTabsCount = tabs.filter(isTabSelected).length;

    if (activeTabsCount > 1) {
        throw new Error('Unable to render tabs with more than 1 active element');
    }

    tabsOpen.attrSet(
        'class',
        [TABS_CLASSNAME, containerClasses, TABS_ACCORDION_CLASSNAME].filter(Boolean).join(' '),
    );

    tabsOpen.attrSet(GROUP_DATA_KEY, tabsGroup);
    tabsOpen.attrSet(TAB_DATA_VARIANT, TabsVariants.Accordion);
    tabsTokens.push(tabsOpen);

    for (let i = 0; i < tabs.length; i++) {
        const tabDetailsOpen = new state.Token('tab_open', 'details', 1);
        const tabSummaryOpen = new state.Token('', 'summary', 1);
        const tabText = new state.Token('text', '', 0);
        const tabSummaryClose = new state.Token('', 'summary', -1);
        const tabContentOpen = new state.Token('tab-content_open', 'div', 1);
        const tabContentClose = new state.Token('tab-content_close', 'div', -1);
        const tabDetailsClose = new state.Token('tab_close', 'details', -1);

        tabDetailsOpen.map = tabs[i].listItem.map;
        tabDetailsOpen.markup = tabs[i].listItem.markup;

        const tab = tabs[i];
        const tabKey = getTabKey(tab);
        const didTabHasActiveAttr = isTabSelected(tab);

        tab.name = getName(tab);

        tabDetailsOpen.map = tabs[i].listItem.map;
        tabDetailsOpen.markup = tabs[i].listItem.markup;
        tabText.content = tabs[i].name;
        tabDetailsOpen.block = true;
        tabDetailsClose.block = true;
        tabContentOpen.block = true;
        tabContentClose.block = true;
        tabDetailsOpen.attrSet('class', TAB_ACCORDION_CLASSNAME);
        tabDetailsOpen.attrSet(TAB_DATA_KEY, tabKey);
        tabSummaryOpen.attrSet('class', TAB_ACCORDION_TITLE_CLASSNAME);
        tabContentOpen.attrSet('class', TAB_ACCORDION_CONTENT_CLASSNAME);

        if (didTabHasActiveAttr) {
            tabDetailsOpen.attrSet('open', '');
        }

        tabsTokens.push(
            tabDetailsOpen,
            tabSummaryOpen,
            tabText,
            tabSummaryClose,
            tabContentOpen,
            ...tabs[i].tokens,
            tabContentClose,
            tabDetailsClose,
        );
    }

    tabsTokens.push(tabsClose);

    return tabsTokens;
};
