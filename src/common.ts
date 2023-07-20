import {TabsController} from './runtime/TabsController';

export const TABS_CLASSNAME = 'yfm-tabs-v2';
export const TABS_LIST_CLASSNAME = 'yfm-tab-list-v2';
export const TAB_CLASSNAME = 'yfm-tab-v2';
export const TAB_PANEL_CLASSNAME = 'yfm-tab-panel-v2';
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
