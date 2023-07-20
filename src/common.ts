import {TabsController} from './runtime/TabsController';

export const TABS_CLASSNAME = 'diplodoc-tabs';
export const TABS_LIST_CLASSNAME = 'diplodoc-tab-list';
export const TAB_CLASSNAME = 'diplodoc-tab';
export const TAB_PANEL_CLASSNAME = 'diplodoc-tab-panel';
export const ACTIVE_CLASSNAME = 'active';

export const GROUP_DATA_KEY = 'data-diplodoc-group';
export const TAB_DATA_KEY = 'data-diplodoc-key';
export const TAB_DATA_ID = 'data-diplodoc-id';

export const SELECT_TAB_EVENT_NAME = 'selecttab';

export const DEFAULT_TABS_GROUP_PREFIX = 'defaultTabsGroup-';

export interface Tab {
    group?: string;
    key: string;
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
