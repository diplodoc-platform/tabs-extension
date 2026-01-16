import type {TabsTokensGenerator} from './types';

import {
    ACTIVE_CLASSNAME,
    GROUP_DATA_KEY,
    TABS_CLASSNAME,
    TABS_LIST_CLASSNAME,
    TAB_ACTIVE_KEY,
    TAB_CLASSNAME,
    TAB_DATA_ID,
    TAB_DATA_KEY,
    TAB_DATA_VARIANT,
    TAB_DATA_VERTICAL_TAB,
    TAB_FORCED_OPEN,
    TAB_PANEL_CLASSNAME,
    VERTICAL_TAB_CLASSNAME,
} from '../../common';
import {generateID, getName, getTabId, getTabKey, isTabSelected} from '../utils';

export const regular: TabsTokensGenerator = (
    tabs,
    state,
    {containerClasses, tabsGroup, runId, variant: orientation},
) => {
    const tabsTokens = [];
    const tabListTokens = [];
    const tabPanelsTokens = [];
    const tabsOpen = new state.Token('tabs_open', 'div', 1);
    const tabsClose = new state.Token('tabs_close', 'div', -1);
    const tabListOpen = new state.Token('tab-list_open', 'div', 1);
    const tabListClose = new state.Token('tab-list_close', 'div', -1);

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

        tabListOpen.map = [start, end];
    }

    tabsOpen.block = true;
    tabsClose.block = true;
    tabListOpen.block = true;
    tabListClose.block = true;

    const activeTabsCount = tabs.filter(isTabSelected).length;

    if (activeTabsCount > 1) {
        throw new Error('Unable to render tabs with more than 1 active element');
    }

    const hasDefaultOpenTab = activeTabsCount !== 0;

    tabsOpen.attrSet('class', [TABS_CLASSNAME, containerClasses].filter(Boolean).join(' '));
    tabsOpen.attrSet(GROUP_DATA_KEY, tabsGroup);
    tabsOpen.attrSet(TAB_DATA_VARIANT, 'regular');

    tabListOpen.attrSet('class', TABS_LIST_CLASSNAME);
    tabListOpen.attrSet('role', 'tablist');

    if (orientation === 'radio') {
        tabsTokens.push(tabsOpen);
    }

    for (let i = 0; i < tabs.length; i++) {
        const tabOpen = new state.Token('tab_open', 'div', 1);
        const tabInline = new state.Token('inline', '', 0);
        const tabText = new state.Token('text', '', 0);
        const tabClose = new state.Token('tab_close', 'div', -1);
        const tabPanelOpen = new state.Token('tab-panel_open', 'div', 1);
        const tabPanelClose = new state.Token('tab-panel_close', 'div', -1);

        const verticalTabInput = new state.Token('tab-input', 'input', 0);
        const verticalTabLabelOpen = new state.Token('tab-label_open', 'label', 1);
        const verticalTabLabelClose = new state.Token('tab-label_close', 'label', -1);

        tabOpen.map = tabs[i].listItem.map;
        tabOpen.markup = tabs[i].listItem.markup;

        const tab = tabs[i];
        const tabId = getTabId(tab, {runId});
        const tabKey = getTabKey(tab);
        const didTabHasActiveAttr = isTabSelected(tab);
        /* if user did not provide default open tab we fallback to first tab (in default tabs only) */
        const isTabActive = hasDefaultOpenTab ? didTabHasActiveAttr : i === 0;

        tab.name = getName(tab);

        const tabPanelId = generateID();

        verticalTabInput.block = true;

        verticalTabInput.attrJoin('class', 'radio');
        verticalTabInput.attrSet('type', 'radio');

        tabOpen.map = tabs[i].listItem.map;
        tabOpen.markup = tabs[i].listItem.markup;
        tabText.content = tabs[i].name;
        tabInline.children = [tabText];
        tabOpen.block = true;
        tabClose.block = true;
        tabPanelOpen.block = true;
        tabPanelClose.block = true;
        tabOpen.attrSet(TAB_DATA_ID, tabId);
        tabOpen.attrSet(TAB_DATA_KEY, tabKey);
        tabOpen.attrSet('class', TAB_CLASSNAME);
        tabOpen.attrJoin('class', 'yfm-tab-group');
        tabOpen.attrSet('role', 'tab');
        tabOpen.attrSet('aria-controls', tabPanelId);
        tabOpen.attrSet('aria-selected', 'false');
        tabOpen.attrSet('tabindex', i === 0 ? '0' : '-1');
        tabOpen.attrSet(TAB_ACTIVE_KEY, 'false');
        tabPanelOpen.attrSet('id', tabPanelId);
        tabPanelOpen.attrSet('class', TAB_PANEL_CLASSNAME);
        tabPanelOpen.attrSet('role', 'tabpanel');
        tabPanelOpen.attrSet('aria-labelledby', tabId);
        tabPanelOpen.attrSet('data-title', tab.name);

        if (orientation === 'radio') {
            tabOpen.attrSet(TAB_DATA_VERTICAL_TAB, 'true');
            tabOpen.attrJoin('class', VERTICAL_TAB_CLASSNAME);
        }

        if (isTabActive) {
            if (orientation === 'radio') {
                tabOpen.attrSet(TAB_FORCED_OPEN, 'true');
                verticalTabInput.attrSet('checked', 'true');
                tabPanelOpen.attrJoin('class', ACTIVE_CLASSNAME);
            } else {
                tabOpen.attrSet(TAB_ACTIVE_KEY, i === 0 ? 'true' : 'false');
                tabOpen.attrJoin('class', ACTIVE_CLASSNAME);
                tabOpen.attrSet('aria-selected', 'true');
                tabPanelOpen.attrJoin('class', ACTIVE_CLASSNAME);
            }
        }

        if (orientation === 'radio') {
            tabsTokens.push(
                tabOpen,
                verticalTabInput,
                verticalTabLabelOpen,
                tabInline,
                verticalTabLabelClose,
                tabClose,
            );
            tabsTokens.push(tabPanelOpen, ...tabs[i].tokens, tabPanelClose);
        } else {
            tabListTokens.push(tabOpen, tabInline, tabClose);
            tabPanelsTokens.push(tabPanelOpen, ...tabs[i].tokens, tabPanelClose);
        }
    }

    tabsTokens.push(tabsOpen);
    tabsTokens.push(tabListOpen);
    tabsTokens.push(...tabListTokens);
    tabsTokens.push(tabListClose);
    tabsTokens.push(...tabPanelsTokens);
    tabsTokens.push(tabsClose);

    return tabsTokens;
};
