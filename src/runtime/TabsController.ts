import {
    ACTIVE_CLASSNAME,
    DEFAULT_TABS_GROUP_PREFIX,
    GROUP_DATA_KEY,
    SELECT_TAB_EVENT_NAME,
    SelectedTabEvent,
    TABS_CLASSNAME,
    TABS_LIST_CLASSNAME,
    TAB_CLASSNAME,
    TAB_DATA_ID,
    TAB_DATA_KEY,
    TAB_PANEL_CLASSNAME,
    Tab,
} from '../common';
import {isCustom, getEventTarget} from './utils';

const Selector = {
    TABS: `.${TABS_CLASSNAME}`,
    TAB_LIST: `.${TABS_LIST_CLASSNAME}`,
    TAB: `.${TAB_CLASSNAME}`,
    TAB_PANEL: `.${TAB_PANEL_CLASSNAME}`,
};

export interface ISelectTabByIdOptions {
    scrollToElement: boolean;
}

export class TabsController extends EventTarget {
    private _selectedTabByGroup: Map<string, Tab> = new Map();
    private _document: Document;

    constructor(document: Document) {
        super();

        this._document = document;
        this._document.addEventListener('click', (event) => {
            const target = getEventTarget(event) as HTMLElement;

            if (isCustom(event) || !this.isValidTabElement(target)) {
                return;
            }

            const tab = this.getTabDataFromHTMLElement(target);
            if (tab) {
                this.selectTab(tab, target.dataset.diplodocId!);
            }
        });
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
            this.selectTab(tab, id);
        }

        if (options?.scrollToElement) {
            target.scrollIntoView();
        }
    }

    selectTab(tab: Tab, currentTabId?: string) {
        const {group, key} = tab;
        if (!group || this._selectedTabByGroup.get(group)?.key === key) {
            return;
        }

        const tabs = this._document.querySelectorAll(
            `${Selector.TABS}[${GROUP_DATA_KEY}="${group}"] ${Selector.TAB}[${TAB_DATA_KEY}="${key}"]`,
        );

        tabs.forEach((element) => {
            const htmlElem = element as HTMLElement;
            if (!this.isValidTabElement(htmlElem) || element.classList.contains(ACTIVE_CLASSNAME)) {
                return;
            }

            const tab = element;
            const tabList = tab.parentNode;
            const tabsContainer = tabList?.parentNode;
            const allTabs = Array.from(tabsContainer?.querySelectorAll(Selector.TAB) || []);
            const allPanels = Array.from(tabsContainer?.querySelectorAll(Selector.TAB_PANEL) || []);
            const targetIndex = allTabs.indexOf(tab);

            for (let i = 0; i < allTabs.length; i++) {
                const tab = allTabs[i];
                const panel = allPanels[i];
                const isTargetTab = i === targetIndex;

                tab.classList.toggle(ACTIVE_CLASSNAME, isTargetTab);
                tab.setAttribute('aria-selected', isTargetTab.toString());
                tab.setAttribute('tabindex', isTargetTab ? '0' : '-1');
                panel.classList.toggle(ACTIVE_CLASSNAME, isTargetTab);
            }
        });

        if (tabs.length > 0) {
            this._selectedTabByGroup.set(group, tab);
            const eventTab: Tab = group.startsWith(DEFAULT_TABS_GROUP_PREFIX)
                ? {key: tab.key}
                : tab;
            this.dispatchEvent(
                new CustomEvent<SelectedTabEvent>(SELECT_TAB_EVENT_NAME, {
                    detail: {tab: eventTab, currentTabId},
                }),
            );
        }
    }

    private isValidTabElement(element: HTMLElement) {
        const tabList =
            element.matches(Selector.TAB) && element.dataset.diplodocId
                ? element.closest(Selector.TAB_LIST)
                : null;
        return tabList?.closest(Selector.TABS);
    }

    private getTabDataFromHTMLElement(target: HTMLElement): Tab | null {
        const key = target.dataset.diplodocKey;
        const group = (target.closest(Selector.TABS) as HTMLElement)?.dataset.diplodocGroup;
        return key && group ? {group, key} : null;
    }
}
