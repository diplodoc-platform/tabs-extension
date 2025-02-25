import {
    ACTIVE_CLASSNAME,
    DEFAULT_TABS_GROUP_PREFIX,
    GROUP_DATA_KEY,
    SelectedTabEvent,
    TABS_CLASSNAME,
    TABS_DROPDOWN_SELECT,
    TABS_LIST_CLASSNAME,
    TABS_RADIO_CLASSNAME,
    TAB_CLASSNAME,
    TAB_DATA_ID,
    TAB_DATA_KEY,
    TAB_DATA_VARIANT,
    TAB_FORCED_OPEN,
    TAB_PANEL_CLASSNAME,
    Tab,
    TabsVariants,
} from '../common';

import {
    ElementOffset,
    getClosestScrollableParent,
    getEventTarget,
    getOffsetByScrollableParent,
    isCustom,
} from './utils';

const Selector = {
    TABS: `.${TABS_CLASSNAME}`,
    TAB_LIST: `.${TABS_LIST_CLASSNAME}`,
    TAB: `.${TAB_CLASSNAME}`,
    TAB_PANEL: `.${TAB_PANEL_CLASSNAME}`,
    VERTICAL_TABS: `.${TABS_RADIO_CLASSNAME}`,
};

export interface ISelectTabByIdOptions {
    scrollToElement: boolean;
}

type Handler = (data: SelectedTabEvent) => void;

type TabSwitchDirection = 'left' | 'right';

type TabsHistory = Record<string, {key: string; variant: TabsVariants}>;

export class TabsController {
    private _document: Document;
    private _onSelectTabHandlers: Set<Handler> = new Set();
    private _updateQueryState: boolean;

    // TODO: remove side effects from constructor
    constructor(document: Document, updateQueryState = true) {
        this._document = document;
        this._updateQueryState = updateQueryState;

        this._document.addEventListener('click', (event) => {
            const target = getEventTarget(event) as HTMLElement;

            if (event.target) {
                this.hideAllDropdown(event.target as HTMLElement);
            }

            if (isCustom(event)) {
                return;
            }

            if (this.isElementDropdownSelect(target)) {
                target.classList.toggle(ACTIVE_CLASSNAME);

                return;
            }

            if (!this.isValidTabElement(target)) {
                return;
            }

            const tab = this.getTabDataFromHTMLElement(target);

            if (tab) {
                this._selectTab(tab, target);
            }
        });

        this._document.addEventListener('keydown', (event) => {
            let direction: TabSwitchDirection | null = null;
            switch (event.key) {
                case 'ArrowLeft': {
                    direction = 'left';
                    break;
                }
                case 'ArrowRight': {
                    direction = 'right';
                    break;
                }
                case 'ArrowUp': {
                    direction = 'left';
                    break;
                }
                case 'ArrowDown': {
                    direction = 'right';
                    break;
                }
            }
            if (!direction) {
                return;
            }

            const target = getEventTarget(event) as HTMLElement;

            if (isCustom(event) || !this.isValidTabElement(target)) {
                return;
            }

            const {tabs, nodes} = this.getTabs(target);
            const currentTab = this.getTabDataFromHTMLElement(target);
            const currentTabIndex = tabs.findIndex(
                ({key}) => currentTab?.key && key === currentTab.key,
            );
            if (!currentTab || tabs.length <= 1 || currentTabIndex === -1) {
                return;
            }

            const newIndex =
                (currentTabIndex + (direction === 'left' ? -1 : 1) + tabs.length) % tabs.length;

            this.selectTab(tabs[newIndex]);
            nodes[newIndex].focus();
        });
    }

    onSelectTab(handler: Handler) {
        this._onSelectTabHandlers.add(handler);

        return () => {
            this._onSelectTabHandlers.delete(handler);
        };
    }

    selectTabById(id: string, options?: ISelectTabByIdOptions) {
        const target = this._document.querySelector(
            `${Selector.TAB}[${TAB_DATA_ID}="${id}"]`,
        ) as HTMLElement;

        if (!target || !this.isValidTabElement(target)) {
            return;
        }

        const tab = this.getTabDataFromHTMLElement(target);

        if (tab) {
            this._selectTab(tab, target);
        }

        if (options?.scrollToElement) {
            target.scrollIntoView();
        }
    }

    selectTab(tab: Tab) {
        this._selectTab(tab);
    }

    restoreTabsPreferred(tabsHistory: TabsHistory | undefined = undefined) {
        if (!tabsHistory) {
            tabsHistory = JSON.parse(localStorage.getItem('tabsHistory') || '{}') as TabsHistory;
        }

        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('tabs')) {
            const tabsFromQuery = urlParams.get('tabs') || '';
            const tabConfigs = tabsFromQuery.split(',');

            tabConfigs.forEach((config) => {
                const [group, key, variant] = config.split('_');

                if (group && key && Object.values(TabsVariants).includes(variant as TabsVariants)) {
                    const keyWithSpaces = key;
                    tabsHistory[group] = {key: keyWithSpaces, variant: variant as TabsVariants};
                }
            });
        }

        for (const [group, fields] of Object.entries(tabsHistory)) {
            if (group) {
                const tab = {group, ...fields};
                this.selectTab(tab);
            }
        }
    }

    updateQueryParamWithTabs(tabsHistory: TabsHistory) {
        if (!this._updateQueryState) {
            return;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const tabsArray = Object.entries(tabsHistory).map(
            ([group, {key, variant}]) => `${group}_${key}_${variant}`,
        );
        urlParams.set('tabs', tabsArray.join(','));

        // Update the URL without reloading the page
        const newUrl = `${window.location.origin}${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);
    }

    clearTabsPreferred() {
        localStorage.removeItem('tabsHistory');
        this.updateQueryParamWithTabs({});
    }

    private _selectTab(tab: Tab, targetTab?: HTMLElement) {
        const {group, key, variant} = tab;

        if (!group) {
            return;
        }

        this.saveTabPreferred({group, key, variant});

        const scrollableParent = targetTab && getClosestScrollableParent(targetTab);
        const previousTargetOffset =
            scrollableParent && getOffsetByScrollableParent(targetTab, scrollableParent);

        const updatedTabs = this.updateHTML({group, key, variant}, targetTab, variant);

        if (updatedTabs > 0) {
            this.fireSelectTabEvent({group, key, variant}, targetTab?.dataset.diplodocId);

            if (previousTargetOffset) {
                this.resetScroll(targetTab, scrollableParent, previousTargetOffset);
            }
        }
    }

    private updateHTML(tab: Required<Tab>, target: HTMLElement | undefined, variant: TabsVariants) {
        switch (variant) {
            case TabsVariants.Radio: {
                return this.updateHTMLRadio(tab, target);
            }
            case TabsVariants.Accordion: {
                return this.updateHTMLAccordion(tab, target);
            }
            case TabsVariants.Regular: {
                return this.updateHTMLRegular(tab);
            }
            case TabsVariants.Dropdown: {
                return this.updateHTMLDropdown(tab);
            }
            default: {
                return 0;
            }
        }
    }

    private saveTabPreferred(tab: Required<Tab>) {
        const tabsHistory = JSON.parse(localStorage.getItem('tabsHistory') || '{}');
        tabsHistory[tab.group] = {key: tab.key, variant: tab.variant};
        localStorage.setItem('tabsHistory', JSON.stringify(tabsHistory));

        this.updateQueryParamWithTabs(tabsHistory);
    }

    private updateHTMLRadio(tab: Required<Tab>, target: HTMLElement | undefined) {
        const {group, key} = tab;

        const {isForced, root} = this.didTabOpenForce(target);

        const singleTabSelector = isForced ? `.yfm-vertical-tab[${TAB_FORCED_OPEN}="true"]` : '';

        const tabs = this._document.querySelectorAll(
            `${Selector.TABS}[${GROUP_DATA_KEY}="${group}"] ${Selector.TAB}[${TAB_DATA_KEY}^="${key}"]${singleTabSelector}`,
        );

        if (isForced) {
            root?.removeAttribute(TAB_FORCED_OPEN);
        }

        let updated = 0;

        tabs.forEach((tab) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const root = tab.parentNode!;
            const elements = root.children;

            for (let i = 0; i < elements.length; i += 2) {
                const [title, content] = [elements.item(i), elements.item(i + 1)] as HTMLElement[];

                const input = title.children.item(0) as HTMLInputElement;

                if (title === tab) {
                    const checked = input.checked;

                    if (checked) {
                        title.classList.remove('active');
                        content?.classList.remove('active');

                        input.removeAttribute('checked');
                    } else {
                        title.classList.add('active');
                        content?.classList.add('active');

                        input.setAttribute('checked', 'true');
                    }

                    continue;
                }

                if (input.hasAttribute('checked')) {
                    title.classList.remove('active');
                    content?.classList.remove('active');

                    input.removeAttribute('checked');
                }

                updated++;
            }
        });

        return updated;
    }

    private updateHTMLRegular(tab: Required<Tab>) {
        const {group, key} = tab;

        const tabs = this._document.querySelectorAll(
            `${Selector.TABS}[${GROUP_DATA_KEY}="${group}"] ${Selector.TAB}[${TAB_DATA_KEY}="${key}"]`,
        );

        let updated = 0;

        tabs.forEach((element) => {
            const htmlElem = element as HTMLElement;
            if (!this.isValidTabElement(htmlElem) || htmlElem.dataset.diplodocIsActive === 'true') {
                return;
            }

            updated++;

            const tab = element;
            const tabList = tab.parentNode;
            const tabsContainer = tabList?.parentNode;
            const allTabs = Array.from(tabList?.querySelectorAll(Selector.TAB) || []);
            const allPanels = Array.from(tabsContainer?.children || []).filter((node) =>
                node.classList.contains(TAB_PANEL_CLASSNAME),
            );
            const targetIndex = allTabs.indexOf(tab);

            allTabs.forEach((tab, i) => {
                const panel = allPanels[i];
                const isTargetTab = i === targetIndex;
                const htmlElem = tab as HTMLElement;

                htmlElem.dataset.diplodocIsActive = isTargetTab ? 'true' : 'false';

                tab.classList.toggle(ACTIVE_CLASSNAME, isTargetTab);
                tab.setAttribute('aria-selected', isTargetTab.toString());
                tab.setAttribute('tabindex', isTargetTab ? '0' : '-1');
                panel.classList.toggle(ACTIVE_CLASSNAME, isTargetTab);
            });
        });

        return updated;
    }

    private updateHTMLDropdown(tab: Required<Tab>) {
        const {group, key} = tab;

        const tabs = this._document.querySelectorAll(
            `${Selector.TABS}[${GROUP_DATA_KEY}="${group}"] ${Selector.TAB}[${TAB_DATA_KEY}="${key}"]`,
        );

        let changed = 0;

        tabs.forEach((tab) => {
            const dropdown = tab.closest(`[${TAB_DATA_VARIANT}=${TabsVariants.Dropdown}]`);

            if (!dropdown?.children) {
                return;
            }

            const select = dropdown.children.item(0) as HTMLElement;
            const menu = dropdown.children.item(1);

            select?.classList.remove(ACTIVE_CLASSNAME);

            /* first and second elements are select / menu, skipping them */
            const changedIndex = Array.from(menu?.children || []).indexOf(tab) + 2;

            for (let i = 2; i < dropdown.children.length; i++) {
                const item = dropdown.children.item(i) as HTMLElement;
                const menuItem = menu?.children.item(i - 2) as HTMLElement;

                changed++;

                if (changedIndex === i) {
                    item?.classList.add(ACTIVE_CLASSNAME);
                    menuItem.classList.add(ACTIVE_CLASSNAME);

                    select.innerHTML = tab.innerHTML;
                    select.classList.add('filled');

                    continue;
                }

                menuItem.classList.remove(ACTIVE_CLASSNAME);
                item.classList.remove(ACTIVE_CLASSNAME);
            }
        });

        return changed;
    }

    private updateHTMLAccordion(tab: Required<Tab>, target: HTMLElement | undefined) {
        const {group, key} = tab;

        const tabs = this._document.querySelectorAll(
            `${Selector.TABS}[${GROUP_DATA_KEY}="${group}"] ${Selector.TAB}[${TAB_DATA_KEY}="${key}"]`,
        );

        let changed = 0;

        tabs.forEach((tab) => {
            const accordion = tab.closest(`[${TAB_DATA_VARIANT}=${TabsVariants.Accordion}]`);

            if (!accordion?.children) {
                return;
            }

            for (let i = 0; i < accordion.children.length; i += 2) {
                const title = accordion.children.item(i);
                const currentTab = accordion.children.item(i + 1);

                changed++;

                if (tab === title) {
                    title?.classList.toggle(ACTIVE_CLASSNAME);
                    currentTab?.classList.toggle(ACTIVE_CLASSNAME);

                    continue;
                }

                title?.classList.remove(ACTIVE_CLASSNAME);
                currentTab?.classList.remove(ACTIVE_CLASSNAME);
            }
        });

        if (target && !this.checkVisible(target)) {
            setTimeout(() => {
                target.scrollIntoView({block: 'nearest'});
            });
        }

        return changed;
    }

    private checkVisible(element: HTMLElement) {
        const rect = element.getBoundingClientRect();
        const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);

        return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
    }

    private hideAllDropdown(target: HTMLElement) {
        const dropdowns = this._document.querySelectorAll('.yfm-tabs-dropdown-select.active');

        dropdowns.forEach((menu) => {
            if (!menu.contains(target)) {
                menu.classList.remove(ACTIVE_CLASSNAME);
            }
        });
    }

    private resetScroll(
        target: HTMLElement,
        scrollableParent: HTMLElement,
        previousTargetOffset: ElementOffset,
    ) {
        const targetOffset = getOffsetByScrollableParent(target, scrollableParent);
        const topDelta = targetOffset.top - previousTargetOffset.top;
        const leftDelta = targetOffset.left - previousTargetOffset.left;
        const scrollTopDelta = targetOffset.scrollTop - previousTargetOffset.scrollTop;
        const scrollLeftDelta = targetOffset.scrollLeft - previousTargetOffset.scrollLeft;
        scrollableParent.scrollTo(
            scrollableParent.scrollLeft + leftDelta - scrollLeftDelta,
            scrollableParent.scrollTop + topDelta - scrollTopDelta,
        );
    }

    private didTabOpenForce(target?: HTMLElement) {
        if (!target) {
            return {};
        }

        if (target.dataset.diplodocForced) {
            return {root: target, isForced: true};
        }

        const root = target.dataset.diplodocVerticalTab ? target : target.parentElement;

        const isForced = typeof root?.dataset.diplodocForced !== 'undefined';

        return {root, isForced};
    }

    private fireSelectTabEvent(tab: Required<Tab>, diplodocId?: string) {
        const {group, key, variant: align} = tab;

        const eventTab: Tab = group.startsWith(DEFAULT_TABS_GROUP_PREFIX)
            ? {key, variant: align}
            : tab;

        this._onSelectTabHandlers.forEach((handler) => {
            handler({tab: eventTab, currentTabId: diplodocId});
        });
    }

    private getTabsType(element: HTMLElement) {
        const tabsRoot = element.closest(`[${TAB_DATA_VARIANT}]`) as HTMLElement | undefined;

        if (!tabsRoot) {
            return undefined;
        }

        return tabsRoot.dataset.diplodocVariant;
    }

    private isValidTabElement(element: HTMLElement) {
        return Boolean(this.getTabsType(element));
    }

    private isElementDropdownSelect(target: HTMLElement) {
        return target.classList.contains(TABS_DROPDOWN_SELECT);
    }

    private getTabDataFromHTMLElement(target: HTMLElement): Tab | null {
        const type = this.getTabsType(target);

        if (type === TabsVariants.Radio) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const tab = target.dataset.diplodocVerticalTab ? target : target.parentElement!;

            const key = tab.dataset.diplodocKey;
            const group = (tab.closest(Selector.TABS) as HTMLElement)?.dataset.diplodocGroup;
            return key && group ? {group, key, variant: TabsVariants.Radio} : null;
        }

        if (type === TabsVariants.Dropdown || type === TabsVariants.Accordion) {
            const key = target.dataset.diplodocKey;
            const group = (target.closest(Selector.TABS) as HTMLElement)?.dataset.diplodocGroup;
            return key && group ? {group, key, variant: type} : null;
        }

        const key = target.dataset.diplodocKey;
        const group = (target.closest(Selector.TABS) as HTMLElement)?.dataset.diplodocGroup;
        return key && group ? {group, key, variant: TabsVariants.Regular} : null;
    }

    private getTabs(target: HTMLElement): {tabs: Tab[]; nodes: NodeListOf<HTMLElement>} {
        const group = (target.closest(Selector.TABS) as HTMLElement)?.dataset.diplodocGroup;
        const nodes = (
            target.closest(Selector.TAB_LIST) as HTMLElement
        )?.querySelectorAll<HTMLElement>(Selector.TAB);

        const tabs: Tab[] = [];
        nodes.forEach((tabEl) => {
            const key = tabEl?.dataset.diplodocKey;
            if (!key) {
                return;
            }

            /** horizontal-only supported feature (used in left/right button click) */
            tabs.push({
                group,
                key,
                variant: TabsVariants.Regular,
            });
        });

        return {tabs, nodes};
    }
}
