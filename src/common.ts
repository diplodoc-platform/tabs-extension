export const TABS_CLASSNAME = 'yfm-tabs';
export const TABS_LIST_CLASSNAME = 'yfm-tab-list';
export const TAB_CLASSNAME = 'yfm-tab';
export const TAB_PANEL_CLASSNAME = 'yfm-tab-panel';
export const ACTIVE_CLASSNAME = 'active';

export const GROUP_DATA_KEY = 'data-diplodoc-group';
export const TAB_DATA_KEY = 'data-diplodoc-key';

export const SELECT_TAB_EVENT_NAME = 'selecttab';

export interface Tab {
    group: string;
    key: string;
}

export interface SelectedTabEvent {
    tab: Tab;
}
