import {afterEach, beforeEach, describe, expect, it, test} from 'vitest';

import {
    GROUP_DATA_KEY,
    TABS_LIST_CLASSNAME,
    TAB_CLASSNAME,
    TAB_DATA_KEY,
    TabsVariants,
} from '../src/common';
import {TabsController, type TabsHistory} from '../src/runtime/TabsController';

import {renderWithTabsPlugin} from './utils';

/**
 * Build Tab payload from a tab element. Use getAttribute so key/group match DOM exactly (jsdom dataset can differ).
 * @param {HTMLElement} el - Tab DOM element
 * @returns {{ group: string, key: string, variant: TabsVariants } | null} Tab data or null if not found
 */
function getTabDataFromElement(
    el: HTMLElement,
): {group: string; key: string; variant: TabsVariants} | null {
    const root = el.closest(`[${GROUP_DATA_KEY}]`) as HTMLElement | null;
    const group = root?.getAttribute(GROUP_DATA_KEY) ?? undefined;
    const key = el.getAttribute(TAB_DATA_KEY) ?? undefined;
    if (!group || !key) return null;
    return {group, key, variant: TabsVariants.Regular};
}

/**
 * Like getTabDataFromElement but throws in tests when data is missing (avoids non-null assertion).
 * @param {HTMLElement} el - Tab DOM element
 * @returns {{ group: string, key: string, variant: TabsVariants }} Tab data
 */
function getTabDataOrThrow(el: HTMLElement): {group: string; key: string; variant: TabsVariants} {
    const data = getTabDataFromElement(el);
    expect(data).toBeTruthy();
    if (!data) throw new Error('expected tab data');
    return data;
}

const defaultContent = `
{% list tabs group=g0 %}

- Tab with unordered list

    Here is unordered list

    - Unordered list item 1

    - Unordered list item 2

    - Unordered list item 3

    - Unordered list item 4

- Tab with ordered list

    Here is ordered list

    1. Ordered list item 1

    1. Ordered list item 2

    1. Ordered list item 3

    1. Ordered list item 4

- First level tab

    Sample text inside first level tab

    {% list tabs group=g1 %}

    - Nested tab 1

        Contents of nested tab 1

    - Nested tab 2

        Contents of nested tab 2

    {% endlist %}

{% endlist %}
`;

/**
 * HTML from the tabs plugin for defaultContent (group=g0 with nested group=g1). Uses MarkdownIt + plugin, no @diplodoc/transform.
 * @returns {string} Rendered HTML
 */
function getPluginHtml(): string {
    return renderWithTabsPlugin(defaultContent);
}

/**
 * Runtime tests use HTML produced by the plugin (getPluginHtml) and controller API (selectTab / selectTabById).
 * In Vitest+jsdom event delegation often doesn't update DOM, so we drive the controller via API.
 */
describe('Testing runtime features', () => {
    let tabs: NodeListOf<HTMLElement>;
    let nestedTabs: NodeListOf<HTMLElement>;
    let tabController: TabsController;

    beforeEach(() => {
        document.body.innerHTML = getPluginHtml();

        // eslint-disable-next-line no-new
        tabController = new TabsController(document, {
            saveTabsToLocalStorage: true,
            saveTabsToQueryStateMode: 'page',
        });
        tabController.clearTabsPreferred();

        tabs = document.querySelectorAll(
            `[${GROUP_DATA_KEY}="g0"] > .${TABS_LIST_CLASSNAME} > .${TAB_CLASSNAME}`,
        );
        nestedTabs = document.querySelectorAll(
            `[${GROUP_DATA_KEY}="g1"] > .${TABS_LIST_CLASSNAME} > .${TAB_CLASSNAME}`,
        );

        if (!tabs.length) {
            throw new Error('No tabs found');
        }
    });

    afterEach(() => {
        tabController.clearTabsPreferred();
    });

    test.each([0, 1, 2])('select tab updates DOM (active class)', (tabToSelectIndex) => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        const tabData = getTabDataOrThrow(tabs[tabToSelectIndex]);
        tabController.selectTab(tabData);

        tabs.forEach((tab, index) => {
            if (tabToSelectIndex === index) {
                expect(tab.classList.contains('active')).toBeTruthy();
            } else {
                expect(tab.classList.contains('active')).not.toBeTruthy();
            }
        });
    });

    it('roving tabindex: select next/prev tab via API (same logic as ArrowRight/Left)', () => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabController.selectTab(getTabDataOrThrow(tabs[1]));
        tabs[1].focus();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabController.selectTab(getTabDataOrThrow(tabs[2]));
        tabs[2].focus();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();

        tabController.selectTab(getTabDataOrThrow(tabs[0]));
        tabs[0].focus();
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    it('roving tabindex left: select prev tab via API', () => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        tabController.selectTab(getTabDataOrThrow(tabs[2]));
        tabs[2].focus();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();

        tabController.selectTab(getTabDataOrThrow(tabs[1]));
        tabs[1].focus();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabController.selectTab(getTabDataOrThrow(tabs[0]));
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    it('roving tabindex should not work if not focused on tab', () => {
        const fakeButton = window.document.createElement('button');
        fakeButton.innerText = 'Fake button';
        window.document.body.append(fakeButton);
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        fakeButton.focus();
        fakeButton.dispatchEvent(
            new KeyboardEvent('keydown', {key: 'ArrowLeft', bubbles: true, cancelable: true}),
        );

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(fakeButton);
    });

    test.each(['right', 'left'])(
        'nested tabs: select parent tab then inner tab, then switch inner via API',
        (_direction) => {
            const tab2Data = getTabDataOrThrow(tabs[2]);
            const nested0Data = getTabDataOrThrow(nestedTabs[0]);
            const nested1Data = getTabDataOrThrow(nestedTabs[1]);

            tabController.selectTab(tab2Data);
            tabController.selectTab(nested0Data);
            expect(nestedTabs[0].classList.contains('active')).toBeTruthy();
            expect(nestedTabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[0].classList.contains('active')).not.toBeTruthy();
            expect(tabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[2].classList.contains('active')).toBeTruthy();

            tabController.selectTab(nested1Data);
            expect(nestedTabs[0].classList.contains('active')).not.toBeTruthy();
            expect(nestedTabs[1].classList.contains('active')).toBeTruthy();
            expect(tabs[0].classList.contains('active')).not.toBeTruthy();
            expect(tabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[2].classList.contains('active')).toBeTruthy();

            tabController.selectTab(nested0Data);
            expect(nestedTabs[0].classList.contains('active')).toBeTruthy();
            expect(nestedTabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[0].classList.contains('active')).not.toBeTruthy();
            expect(tabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[2].classList.contains('active')).toBeTruthy();
        },
    );

    it('should save the state of grouped tabs by selecting tab[1]', () => {
        tabController.selectTab(getTabDataOrThrow(tabs[1]));
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        const savedState = JSON.parse(localStorage.getItem('tabsHistory') as string);
        expect(savedState).toEqual({
            g0: {
                key: 'tab-with-ordered-list',
                variant: 'regular',
            },
        });
    });

    it('omits the first tab from URL while keeping it in localStorage', () => {
        tabController.onPageChanged();

        tabController.selectTab(getTabDataOrThrow(tabs[1]));
        expect(new URLSearchParams(window.location.search).get('tabs')).toBe(
            'g0_tab-with-ordered-list',
        );

        tabController.selectTab(getTabDataOrThrow(tabs[0]));

        expect(new URLSearchParams(window.location.search).has('tabs')).toBe(false);
        expect(tabController.getTabsFromLocalStorage()).toEqual({
            g0: {
                key: 'tab-with-unordered-list',
                variant: TabsVariants.Regular,
            },
        });
    });

    it('keeps the first tab in URL when another tab is selected by default', () => {
        document.body.innerHTML = renderWithTabsPlugin(`
{% list tabs group=custom_default %}

- First tab

  First content.

- Second tab {selected}

  Second content.

{% endlist %}
`);
        tabController.onPageChanged();

        const customTabs = document.querySelectorAll<HTMLElement>(
            `[${GROUP_DATA_KEY}="custom_default"] > .${TABS_LIST_CLASSNAME} > .${TAB_CLASSNAME}`,
        );
        expect(customTabs[1].classList.contains('active')).toBeTruthy();

        tabController.selectTab(getTabDataOrThrow(customTabs[0]));
        expect(new URLSearchParams(window.location.search).get('tabs')).toBe(
            'custom_default_first-tab',
        );

        tabController.selectTab(getTabDataOrThrow(customTabs[1]));
        expect(new URLSearchParams(window.location.search).has('tabs')).toBe(false);
    });

    it('keeps the first radio tab in URL because it is closed by default', () => {
        document.body.innerHTML = renderWithTabsPlugin(`
{% list tabs group=radio radio %}

- First radio tab

  First content.

- Second radio tab

  Second content.

{% endlist %}
`);

        tabController.updateQueryParamWithTabs({
            radio: {
                key: 'first-radio-tab',
                variant: TabsVariants.Radio,
            },
        });

        expect(new URLSearchParams(window.location.search).get('tabs')).toBe(
            'radio_first-radio-tab_radio',
        );
    });

    it('serializes and restores a radio tab when its group contains underscores', () => {
        document.body.innerHTML = renderWithTabsPlugin(`
{% list tabs group=height_demo radio %}

- First radio tab

  First content.

- Second radio tab

  Second content.

{% endlist %}
`);
        const tabsHistory = {
            height_demo: {
                key: 'first-radio-tab',
                variant: TabsVariants.Radio,
            },
        };

        tabController.updateQueryParamWithTabs(tabsHistory);

        expect(new URLSearchParams(window.location.search).get('tabs')).toBe(
            'height_demo_first-radio-tab_radio',
        );

        const parsedTabsHistory = tabController.getTabsFromSearchQuery();
        expect(parsedTabsHistory).toEqual(tabsHistory);

        tabController.restoreTabs(parsedTabsHistory);
        const radioTabs = document.querySelectorAll<HTMLElement>(
            `[${GROUP_DATA_KEY}="height_demo"] > .${TAB_CLASSNAME}`,
        );
        expect(Array.from(radioTabs, (tab) => tab.classList.contains('active'))).toEqual([
            true,
            false,
        ]);
    });

    it('should restore the state of grouped tabs from localStorage', () => {
        tabController.selectTab(getTabDataOrThrow(tabs[2]));
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();

        localStorage.setItem(
            'tabsHistory',
            JSON.stringify({
                g0: {
                    key: 'tab-with-ordered-list',
                    variant: 'regular',
                },
            }),
        );
        tabController.updateQueryParamWithTabs({});

        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    it('does not migrate legacy localStorage keys', () => {
        localStorage.setItem(
            'tabsHistory',
            JSON.stringify({
                g0: {
                    key: 'tab%20with%20ordered%20list',
                    variant: 'regular',
                },
            }),
        );

        tabController.restoreTabs(tabController.getTabsFromLocalStorage());

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(localStorage.getItem('tabsHistory')).toContain('tab%20with%20ordered%20list');
    });

    it('writes legacy localStorage keys to URL as slugs without migrating localStorage', () => {
        const legacyFirstKey = encodeURIComponent('Tab with unordered list').toLocaleLowerCase();
        const tabsHistory = {
            g0: {key: legacyFirstKey, variant: TabsVariants.Regular},
            g1: {key: 'nested-tab-2', variant: TabsVariants.Regular},
        };
        localStorage.setItem('tabsHistory', JSON.stringify(tabsHistory));

        tabController.updateQueryParamWithTabs(tabsHistory);

        expect(new URLSearchParams(window.location.search).get('tabs')).toBe('g1_nested-tab-2');
        expect(localStorage.getItem('tabsHistory')).toContain(legacyFirstKey);
    });

    it('should handle invalid or missing saved state during restore', () => {
        localStorage.removeItem('tabsHistory');

        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        localStorage.setItem(
            'tabsHistory',
            JSON.stringify({
                g0: {
                    key: 'Non-existent tab',
                    variant: 'regular',
                },
            }),
        );

        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    it('should restore the state of grouped tabs from search query', () => {
        tabController.selectTab(getTabDataOrThrow(tabs[2]));
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();

        const searchParams = new URLSearchParams();
        searchParams.set('tabs', 'g0_tab%20with%20ordered%20list');

        const newUrl = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);

        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    it('normalizes a legacy Russian key from search query', () => {
        const legacyKey = encodeURIComponent('Второй русский таб').toLocaleLowerCase();
        const searchParams = new URLSearchParams();
        searchParams.set('tabs', `russian_${legacyKey}`);

        const newUrl = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);

        expect(tabController.getTabsFromSearchQuery()).toEqual({
            russian: {
                key: 'vtoroj-russkij-tab',
                variant: TabsVariants.Regular,
            },
        });
    });

    it('restores a tab when its group contains underscores', () => {
        document.body.innerHTML = renderWithTabsPlugin(`
{% list tabs group=height_demo %}

- Короткая

  Короткий блок.

- Высокая

  Высокий блок.

{% endlist %}
`);
        const searchParams = new URLSearchParams();
        searchParams.set('tabs', 'height_demo_vysokaya');

        const newUrl = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);

        expect(tabController.getTabsFromSearchQuery()).toEqual({
            height_demo: {
                key: 'vysokaya',
                variant: TabsVariants.Regular,
            },
        });

        tabController.restoreTabs(tabController.getTabsFromSearchQuery());
        const heightTabs = document.querySelectorAll<HTMLElement>(
            `[${GROUP_DATA_KEY}="height_demo"] > .${TABS_LIST_CLASSNAME} > .${TAB_CLASSNAME}`,
        );
        expect(heightTabs[1].classList.contains('active')).toBeTruthy();
    });

    it('restores a legacy tab key containing underscores', () => {
        document.body.innerHTML = renderWithTabsPlugin(`
{% list tabs group=legacy %}

- First tab

  First content.

- Legacy tab {#legacy_tab}

  Legacy content.

{% endlist %}
`);
        const searchParams = new URLSearchParams();
        searchParams.set('tabs', 'legacy_legacy_tab');

        const newUrl = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);

        expect(tabController.getTabsFromSearchQuery()).toEqual({
            legacy: {
                key: 'legacytab',
                variant: TabsVariants.Regular,
            },
        });
    });

    it('returns correct tab groups from the document', () => {
        const expectedGroups = new Set(['g0', 'g1']);
        const currentGroups = tabController.getCurrentPageTabGroups();

        expect(new Set(currentGroups)).toEqual(expectedGroups);
    });

    it('returns empty array if no tabs are present', () => {
        document.body.innerHTML = '';

        expect(tabController.getCurrentPageTabGroups()).toEqual([]);
    });

    it('should correctly filter tabs history for current page', () => {
        const tabsHistory = {
            g0: {
                key: 'tab%20with%20ordered%20list',
                variant: TabsVariants.Regular,
            },
            g1: {
                key: 'Nested%20tab%201',
                variant: TabsVariants.Regular,
            },
            g2: {
                key: 'Some%20other%20tab',
                variant: TabsVariants.Regular,
            },
        } satisfies TabsHistory;

        (tabController as unknown as Record<string, string[]>)._currentPageTabGroups = ['g0', 'g1'];

        const currentPageTabHistory = tabController.getCurrentPageTabHistory(tabsHistory);

        expect(currentPageTabHistory).toEqual({
            g0: {
                key: 'tab%20with%20ordered%20list',
                variant: 'regular',
            },
            g1: {
                key: 'Nested%20tab%201',
                variant: 'regular',
            },
        });
    });
});
