import {
    ACTIVE_CLASSNAME,
    GROUP_DATA_KEY,
    SELECT_TAB_EVENT_NAME,
    TABS_CLASSNAME,
    TABS_LIST_CLASSNAME,
    TAB_CLASSNAME,
    TAB_DATA_KEY,
    TAB_PANEL_CLASSNAME,
} from '../const';
import {isCustom, getEventTarget} from './utils';

const Selector = {
    TABS: `.${TABS_CLASSNAME}`,
    TAB_LIST: `.${TABS_LIST_CLASSNAME}`,
    TAB: `.${TAB_CLASSNAME}`,
    TAB_PANEL: `.${TAB_PANEL_CLASSNAME}`,
};

export interface ISelectTabEventDetails {
    key: string;
    group: string;
}

export class TabsController extends EventTarget {
    constructor(document: Document) {
        super();

        document.addEventListener('click', (event) => {
            const target = getEventTarget(event) as HTMLElement;

            if (isCustom(event) || !this.#isValidTabElement(target)) {
                return;
            }

            const key = target.dataset.diplodocKey;
            const group = (target.closest(Selector.TABS) as HTMLElement)?.dataset.diplodocGroup;

            if (key && group) {
                this.dispatchEvent(
                    new CustomEvent<ISelectTabEventDetails>(SELECT_TAB_EVENT_NAME, {
                        detail: {key, group},
                    }),
                );
            }
        });

        this.addEventListener(SELECT_TAB_EVENT_NAME, (event) => {
            const customEvent = event as CustomEvent<ISelectTabEventDetails>;
            const {key, group} = customEvent.detail;

            if (key && group) {
                this.selectTab(group, key);
            }
        });
    }

    #isValidTabElement(element: HTMLElement) {
        const tabList = element.matches(Selector.TAB) ? element.closest(Selector.TAB_LIST) : null;
        return tabList?.closest(Selector.TABS);
    }

    selectTab(group: string, key: string) {
        const selectedTabs = document.querySelectorAll(
            `${Selector.TABS}[${GROUP_DATA_KEY}="${group}"] ${Selector.TAB}[${TAB_DATA_KEY}="${key}"]`,
        );

        selectedTabs.forEach((element) => {
            const htmlElem = element as HTMLElement;
            if (
                !this.#isValidTabElement(htmlElem) ||
                element.classList.contains(ACTIVE_CLASSNAME)
            ) {
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
    }
}
