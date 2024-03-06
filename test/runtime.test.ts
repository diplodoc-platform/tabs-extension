import {PluginOptions, transform} from '../src/plugin/transform';
import {callPlugin, tokenize} from './utils';
// @ts-ignore
import Token from 'markdown-it/lib/token';
import {DOMWindow, JSDOM} from "jsdom";
import {TabsController} from "../src/runtime/TabsController";

const defaultContent = `
{% list tabs %}

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
- Tab with text

    Sample text

{% endlist %}
`;

function makeTransform(params?: { transformOptions?: Partial<PluginOptions>; content?: string[] }) {
    return callPlugin(
        transform({bundle: false, ...params?.transformOptions}),
        tokenize([defaultContent]),
    );
}

describe('Testing runtime features', () => {
    let dom: JSDOM;
    let window: DOMWindow;
    let tabs: NodeListOf<HTMLElement>;

    beforeEach(() => {
        const {tokens, env, md} = makeTransform();
        const result = md.renderer.render(tokens, {}, env);

        const fragment = JSDOM.fragment(result);
        dom = new JSDOM();
        window = dom.window;
        new TabsController(window.document);
        window.document.body.append(fragment);

        tabs = window.document.querySelectorAll('.yfm-tab');

        if (!tabs.length) {
            throw new Error('No tabs found');
        }
    })

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
        })
    });

    test('roving tabindex on pressing right', () => {
        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();

        tabs[0].focus();
        let keyDownEvent = new window.KeyboardEvent('keydown', {key: 'ArrowRight'});
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
        let keyDownEvent = new window.KeyboardEvent('keydown', {key: 'ArrowLeft'});
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
        let keyDownEvent = new window.KeyboardEvent('keydown', {key: 'ArrowLeft'});
        keyDownEvent.initEvent('keydown', true, true);
        fakeButton.dispatchEvent(keyDownEvent);

        expect(tabs[0].classList.contains('active')).toBeTruthy();
        expect(tabs[1].classList.contains('active')).not.toBeTruthy();
        expect(tabs[2].classList.contains('active')).not.toBeTruthy();
        expect(window.document.activeElement).toBe(fakeButton);
    });
});
