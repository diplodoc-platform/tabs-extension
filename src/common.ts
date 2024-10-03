import {type TabsController} from './runtime/TabsController';

export const TAB_RE = /`?{% list tabs .*?%}`?/;
export const TABS_CLASSNAME = 'yfm-tabs';
export const TAB_CLASSNAME = 'yfm-tab';
export const TAB_PANEL_CLASSNAME = 'yfm-tab-panel';
export const TABS_LIST_CLASSNAME = 'yfm-tab-list';
export const ACTIVE_CLASSNAME = 'active';
export const TAB_GROUP_CLASSNAME = 'yfm-tab-group';
export const TAB_ACTIVE_KEY = 'data-diplodoc-is-active';
export const GROUP_DATA_KEY = 'data-diplodoc-group';
export const TAB_DATA_KEY = 'data-diplodoc-key';
export const TAB_DATA_VARIANT = 'data-diplodoc-variant';
export const TAB_DATA_ID = 'data-diplodoc-id';
export const DEFAULT_TABS_GROUP_PREFIX = 'defaultTabsGroup-';
export const ACTIVE_TAB_TEXT = '{selected}';
export const TAB_FORCED_OPEN = 'data-diplodoc-forced';

export const TABS_DROPDOWN_CLASSNAME = 'yfm-tabs-dropdown';
export const TABS_DROPDOWN_MENU_CLASSNAME = 'yfm-tabs-dropdown-menu';
export const TABS_DROPDOWN_SELECT = 'yfm-tabs-dropdown-select';

export const TABS_ACCORDION_CLASSNAME = 'yfm-tabs-accordion';
export const TABS_ACCORDION_CLIENT_HEIGHT = 'data-yfm-tabs-accordion-client-heights';

export const TABS_RADIO_CLASSNAME = 'yfm-tabs-vertical';
export const VERTICAL_TAB_CLASSNAME = 'yfm-vertical-tab';
export const TAB_DATA_VERTICAL_TAB = 'data-diplodoc-vertical-tab';
export const TAB_RADIO_KEY = 'data-diplodoc-input';

export enum TabsVariants {
    Regular = 'regular',
    Radio = 'radio',
    Dropdown = 'dropdown',
    Accordion = 'accordion',
}

export interface Tab {
    group?: string;
    key: string;
    variant: TabsVariants;
}

export interface SelectedTabEvent {
    tab: Tab;
    currentTabId?: string;
}

export const GLOBAL_SYMBOL: unique symbol = Symbol.for('diplodocTabs');

declare global {
    interface Window {
        [GLOBAL_SYMBOL]: TabsController;
    }
}
