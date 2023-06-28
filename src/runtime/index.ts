import {isCustom, getEventTarget} from './utils';

const Selector = {
    TABS: '.yfm-tabs',
    TAB_LIST: '.yfm-tab-list',
    TAB: '.yfm-tabs .yfm-tab',
    TAB_PANEL: '.yfm-tab-panel',
};

const ClassName = {
    ACTIVE: 'active',
};

function isValidTabElement(element: HTMLElement) {
    const parentNode = element.parentNode as HTMLElement;
    return (
        element.matches(Selector.TAB) ||
        parentNode?.matches(Selector.TAB_LIST) ||
        (parentNode?.parentNode as HTMLElement)?.matches(Selector.TABS)
    );
}

function selectTab(element: HTMLElement) {
    if (!isValidTabElement(element) || element.classList.contains(ClassName.ACTIVE)) {
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

        tab.classList.toggle(ClassName.ACTIVE, isTargetTab);
        tab.setAttribute('aria-selected', isTargetTab.toString());
        tab.setAttribute('tabindex', isTargetTab ? '0' : '-1');
        panel.classList.toggle(ClassName.ACTIVE, isTargetTab);
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
        const target = getEventTarget(event) as HTMLElement;

        if (isCustom(event) || !isValidTabElement(target)) {
            return;
        }

        selectTab(target);
    });
}
