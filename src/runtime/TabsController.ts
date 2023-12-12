import {
    ACTIVE_CLASSNAME,
    DEFAULT_TABS_GROUP_PREFIX,
    GROUP_DATA_KEY,
    SelectedTabEvent,
    TABS_CLASSNAME,
    TABS_LIST_CLASSNAME,
    TAB_CLASSNAME,
    TAB_DATA_ID,
    TAB_DATA_KEY,
    TAB_PANEL_CLASSNAME,
    Tab,
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
};

export interface ISelectTabByIdOptions {
    scrollToElement: boolean;
}

type Handler = (data: SelectedTabEvent) => void;

export class TabsController {
    private _document: Document;

    private _onSelectTabHandlers: Set<Handler> = new Set();

    constructor(document: Document) {
        this._document = document;
        this._document.addEventListener('click', (event) => {
            const target = getEventTarget(event) as HTMLElement;

            if (isCustom(event) || !this.isValidTabElement(target)) {
                return;
            }

            const tab = this.getTabDataFromHTMLElement(target);
            if (tab) {
                this._selectTab(tab, target);
            }
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

    private _selectTab(tab: Tab, targetTab?: HTMLElement) {
        const {group, key} = tab;

        if (!group) {
            return;
        }

        const scrollableParent = targetTab && getClosestScrollableParent(targetTab);
        const previousTargetOffset =
            scrollableParent && getOffsetByScrollableParent(targetTab, scrollableParent);

        const updatedTabs = this.updateHTML({group, key});

        if (updatedTabs > 0) {
            if (previousTargetOffset) {
                this.resetScroll(targetTab, scrollableParent, previousTargetOffset);
            }

            this.fireSelectTabEvent({group, key}, targetTab?.dataset.diplodocId);
        }
    }

    private updateHTML(tab: Required<Tab>) {
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
            const allTabs = Array.from(tabsContainer?.querySelectorAll(Selector.TAB) || []);
            const allPanels = Array.from(tabsContainer?.querySelectorAll(Selector.TAB_PANEL) || []);
            const targetIndex = allTabs.indexOf(tab);

            allTabs.forEach((tab, i) => {
                const panel = allPanels[i];
                const isTargetTab = i === targetIndex;
                const htmlElem = tab as HTMLElement;

                htmlElem.dataset.diplodocIsActive = isTargetTab ? 'true' : 'false';

                tab.classList.toggle(ACTIVE_CLASSNAME, isTargetTab);
                tab.setAttribute('aria-selected', isTargetTab.toString());
                tab.setAttribute('tabindex', isTargetTab ? '-1' : '0');
                panel.classList.toggle(ACTIVE_CLASSNAME, isTargetTab);
            });
        });

        return updated;
    }

    private resetScroll(
        target: HTMLElement,
        scrollableParent: HTMLElement,
        previousTargetOffset: ElementOffset,
    ) {
        const targetOffset = getOffsetByScrollableParent(target, scrollableParent);
        scrollableParent.scrollTo(
            targetOffset.left + scrollableParent.scrollLeft - previousTargetOffset.left,
            targetOffset.top + scrollableParent.scrollTop - previousTargetOffset.top,
        );
    }

    private fireSelectTabEvent(tab: Required<Tab>, diplodocId?: string) {
        const {group, key} = tab;

        const eventTab: Tab = group.startsWith(DEFAULT_TABS_GROUP_PREFIX) ? {key} : tab;

        this._onSelectTabHandlers.forEach((handler) => {
            handler({tab: eventTab, currentTabId: diplodocId});
        });
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
