import {PluginOptions, transform} from '../../src/plugin/transform';
import {TabsController, TabsHistory} from '../../src/runtime/TabsController';
import {GROUP_DATA_KEY, TABS_LIST_CLASSNAME, TAB_CLASSNAME, TabsVariants} from '../../src/common';

import {callPlugin, tokenize} from './utils';

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

function makeTransform(params?: {transformOptions?: Partial<PluginOptions>; content?: string[]}) {
    return callPlugin(
        transform({bundle: false, ...params?.transformOptions}),
        tokenize([defaultContent]),
    );
}

describe('Testing runtime features', () => {
    let tabs: NodeListOf<HTMLElement>;
    let nestedTabs: NodeListOf<HTMLElement>;
    let tabController: TabsController;

    beforeEach(() => {
        const {tokens, env, md} = makeTransform();
        document.body.innerHTML = md.renderer.render(tokens, {}, env);

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

    test.each([0, 1, 2])('click on tab', (tabToSelectIndex) => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabs[tabToSelectIndex].click();

        tabs.forEach((tab, index) => {
            if (tabToSelectIndex === index) {
                expect(tab.classList.contains('active')).toBeTruthy();
            } else {
                expect(tab.classList.contains('active')).not.toBeTruthy();
            }
        });
    });

    test('roving tabindex on pressing right', () => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabs[0].focus();
        const keyDownEvent = new window.KeyboardEvent('keydown', {key: 'ArrowRight'});
        keyDownEvent.initEvent('keydown', true, true);
        tabs[0].dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(tabs[1]);

        tabs[1].dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();
        expect(window.document.activeElement).toBe(tabs[2]);

        tabs[2].dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(tabs[0]);
    });

    test('roving tabindex on pressing left', () => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabs[0].focus();
        const keyDownEvent = new window.KeyboardEvent('keydown', {key: 'ArrowLeft'});
        keyDownEvent.initEvent('keydown', true, true);
        tabs[0].dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();
        expect(window.document.activeElement).toBe(tabs[2]);

        tabs[2].dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(tabs[1]);

        tabs[1].dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(tabs[0]);
    });

    test('roving tabindex should not work if not focused on tab', () => {
        const fakeButton = window.document.createElement('button');
        fakeButton.innerText = 'Fake button';
        window.document.body.append(fakeButton);
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        fakeButton.focus();
        const keyDownEvent = new window.KeyboardEvent('keydown', {key: 'ArrowLeft'});
        keyDownEvent.initEvent('keydown', true, true);
        fakeButton.dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(fakeButton);
    });

    test.each(['ArrowRight', 'ArrowLeft'])(
        'roving tabindex works on nested tabs when pressing right/left arrow keys',
        (key) => {
            tabs[2].click();
            nestedTabs[0].click();
            nestedTabs[0].focus();

            expect(nestedTabs[0].classList.contains('active')).toBeTruthy();
            expect(nestedTabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[0].classList.contains('active')).not.toBeTruthy();
            expect(tabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[2].classList.contains('active')).toBeTruthy();

            const keyDownEvent = new window.KeyboardEvent('keydown', {key});
            keyDownEvent.initEvent('keydown', true, true);
            nestedTabs[0].dispatchEvent(keyDownEvent);

            expect(nestedTabs[0].classList.contains('active')).not.toBeTruthy();
            expect(nestedTabs[1].classList.contains('active')).toBeTruthy();
            expect(window.document.activeElement).toBe(nestedTabs[1]);
            expect(tabs[0].classList.contains('active')).not.toBeTruthy();
            expect(tabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[2].classList.contains('active')).toBeTruthy();

            nestedTabs[1].dispatchEvent(keyDownEvent);

            expect(nestedTabs[0].classList.contains('active')).toBeTruthy();
            expect(nestedTabs[1].classList.contains('active')).not.toBeTruthy();
            expect(window.document.activeElement).toBe(nestedTabs[0]);
            expect(tabs[0].classList.contains('active')).not.toBeTruthy();
            expect(tabs[1].classList.contains('active')).not.toBeTruthy();
            expect(tabs[2].classList.contains('active')).toBeTruthy();
        },
    );

    test('should save the state of grouped tabs by clicking on tab[1]', () => {
        // Выбираем вторую вкладку
        tabs[1].click();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        // Сохраняем состояние вкладок
        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        // Проверяем, что состояние сохранено корректно в localStorage
        const savedState = JSON.parse(localStorage.getItem('tabsHistory') as string);
        expect(savedState).toEqual({
            g0: {
                key: 'tab%20with%20ordered%20list',
                variant: 'regular',
            },
        });
    });

    test('should restore the state of grouped tabs from localStorage', () => {
        // Сбрасываем актуальное состояние вкладок перед восстановлением
        tabs[2].click();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();

        // Предполагаем, что состояние вкладок уже сохранено

        localStorage.setItem(
            'tabsHistory',
            JSON.stringify({
                g0: {
                    key: 'tab%20with%20ordered%20list',
                    variant: 'regular',
                },
            }),
        );
        tabController.updateQueryParamWithTabs({});

        // Восстанавливаем состояние вкладок
        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        // Проверяем, что вторая вкладка стала активной после восстановления
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    test('should handle invalid or missing saved state during restore', () => {
        // Удаляем сохраненное состояние, чтобы имитировать отсутствие данных
        localStorage.removeItem('tabsHistory');

        // Восстанавливаем состояние вкладок
        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        // Проверяем, что первая вкладка активна по умолчанию
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        // Сохраняем неправильное состояние вкладок
        localStorage.setItem(
            'tabsHistory',
            JSON.stringify({
                g0: {
                    key: 'Non-existent tab',
                    variant: 'regular',
                },
            }),
        );

        // Восстанавливаем состояние вкладок
        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        // Проверяем, что первая вкладка активна, так как ключ не совпадает с существующими вкладками
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    test('should restore the state of grouped tabs from search query', () => {
        // Сбрасываем актуальное состояние вкладок перед восстановлением
        tabs[2].click();
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).toBeTruthy();

        // Предполагаем, что состояние вкладок уже сохранено в search query
        const searchParams = new URLSearchParams();
        searchParams.set('tabs', 'g0_tab%20with%20ordered%20list');

        const newUrl = `${window.location.origin}${window.location.pathname}?${searchParams.toString()}`;
        window.history.replaceState({}, document.title, newUrl);

        // Восстанавливаем состояние вкладок
        tabController.restoreTabs({
            ...tabController.getTabsFromLocalStorage(),
            ...tabController.getTabsFromSearchQuery(),
        });

        // Проверяем, что вторая вкладка стала активной после восстановления
        expect(tabs[0].classList.contains('active')).not.toBeTruthy();
        expect(tabs[1].classList.contains('active')).toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
    });

    test('returns correct tab groups from the document', () => {
        const expectedGroups = new Set(['g0', 'g1']);
        const currentGroups = tabController.getCurrentPageTabGroups();

        expect(new Set(currentGroups)).toEqual(expectedGroups);
    });

    test('returns empty array if no tabs are present', () => {
        document.body.innerHTML = ''; // Clear the document body

        expect(tabController.getCurrentPageTabGroups()).toEqual([]);
    });

    test('should correctly filter tabs history for current page', () => {
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
