import type StateCore from 'markdown-it/lib/rules_core/state_core';

import {
    ACTIVE_CLASSNAME,
    GROUP_DATA_KEY,
    TABS_CLASSNAME,
    TABS_DROPDOWN_CLASSNAME,
    TABS_DROPDOWN_MENU_CLASSNAME,
    TABS_DROPDOWN_SELECT,
    TAB_CLASSNAME,
    TAB_DATA_ID,
    TAB_DATA_KEY,
    TAB_DATA_VARIANT,
    TAB_PANEL_CLASSNAME,
} from '../../common';
import {generateID, getContentMap, getName, getTabId, getTabKey, isTabSelected} from '../utils';
import {type RuntimeTab} from '../types';

import {type TabsTokensGenerator} from './types';

export const dropdown: TabsTokensGenerator = (
    tabs: RuntimeTab[],
    state: StateCore,
    {containerClasses, tabsGroup, runId},
) => {
    const dropdownTokens = [];
    const dropdownOpen = new state.Token('dropdown_open', 'div', 1);
    const dropdownClose = new state.Token('dropdown_close', 'div', -1);
    const dropdownSelectOpen = new state.Token('dropdown-select_open', 'div', 1);
    const dropdownSelectInline = new state.Token('inline', '', 0);
    const dropdownSelectText = new state.Token('text', '', 0);
    const dropdownSelectClose = new state.Token('dropdown-select_open', 'div', -1);

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

    dropdownOpen.block = true;
    dropdownClose.block = true;
    dropdownSelectOpen.block = true;
    dropdownSelectClose.block = true;

    const [activeTab, ...restActiveTabs] = tabs.filter(isTabSelected);

    if (restActiveTabs.length) {
        throw new Error('Unable to dropdown tabs with more than 1 active element');
    }

    dropdownOpen.attrSet(
        'class',
        [TABS_CLASSNAME, containerClasses, TABS_DROPDOWN_CLASSNAME].filter(Boolean).join(' '),
    );

    dropdownOpen.attrSet(GROUP_DATA_KEY, tabsGroup);
    dropdownOpen.attrSet(TAB_DATA_VARIANT, 'dropdown');

    dropdownSelectOpen.attrSet('role', 'tablist');
    dropdownSelectOpen.attrSet('class', TABS_DROPDOWN_SELECT);

    if (activeTab) {
        dropdownSelectOpen.attrJoin('class', 'filled');
    }

    dropdownSelectText.content = activeTab ? activeTab.name : '-';
    dropdownSelectInline.children = [dropdownSelectText];

    dropdownTokens.push(
        dropdownOpen,
        dropdownSelectOpen,
        dropdownSelectInline,
        dropdownSelectClose,
    );

    const dropdownMenuOpen = new state.Token('dropdown-menu_open', 'ul', 1);
    const dropdownMenuClose = new state.Token('dropdown-menu_close', 'ul', -1);

    dropdownMenuOpen.attrSet('class', TABS_DROPDOWN_MENU_CLASSNAME);

    const menuTokens = tabs.flatMap((tab) => {
        const menuListItemOpen = new state.Token('dropdown-menu-item_open', 'li', 1);
        const menuListItemClose = new state.Token('dropdown-menu-item_close', 'li', -1);
        const menuListItemText = new state.Token('text', '', 0);
        const menuListItemInline = new state.Token('inline', '', 0);

        const tabId = getTabId(tab, {runId});
        const tabKey = getTabKey(tab);
        const isActive = tab === activeTab;

        menuListItemOpen.attrSet(
            'class',
            [TAB_CLASSNAME, isActive && ACTIVE_CLASSNAME].filter(Boolean).join(' '),
        );
        menuListItemOpen.attrSet(TAB_DATA_ID, tabId);
        menuListItemOpen.attrSet(TAB_DATA_KEY, tabKey);
        menuListItemOpen.attrSet('aria-selected', String(isActive));

        menuListItemText.content = tab.name;
        menuListItemInline.children = [menuListItemText];

        return [menuListItemOpen, menuListItemInline, menuListItemClose];
    });

    dropdownTokens.push(dropdownMenuOpen, ...menuTokens, dropdownMenuClose);

    for (let i = 0; i < tabs.length; i++) {
        const tabPanelOpen = new state.Token('tab-panel_open', 'div', 1);
        const tabPanelClose = new state.Token('tab-panel_close', 'div', -1);

        const tab = tabs[i];
        const tabId = getTabId(tab, {runId});
        const didTabHasActiveAttr = isTabSelected(tab);

        tab.name = getName(tab);

        const tabPanelId = generateID();

        tabPanelOpen.map = getContentMap(tabs[i].tokens);
        tabPanelOpen.block = true;
        tabPanelClose.block = true;
        tabPanelOpen.attrSet('id', tabPanelId);
        tabPanelOpen.attrSet('class', TAB_PANEL_CLASSNAME);
        tabPanelOpen.attrSet('role', 'tabpanel');
        tabPanelOpen.attrSet('aria-labelledby', tabId);
        tabPanelOpen.attrSet('data-title', tab.name);

        if (didTabHasActiveAttr) {
            tabPanelOpen.attrJoin('class', ACTIVE_CLASSNAME);
        }

        dropdownTokens.push(tabPanelOpen, ...tabs[i].tokens, tabPanelClose);
    }

    dropdownTokens.push(dropdownClose);

    return dropdownTokens;
};
