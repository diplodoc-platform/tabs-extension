import {PluginOptions, transform} from '../src/plugin/transform';
import {callPlugin, tokenize} from './utils';
import {base, escaped} from './data/tabs';
import Token from 'markdown-it/lib/token';

const defaultContent = [
    '# Create a folder',
    '',
    '{% list tabs %}',
    '',
    '- Python',
    '',
    '  About python',
    '',
    '- Tab with list',
    '  - One',
    '  - Two',
    '',
    '- Tab with list',
    '  1. One',
    '  2. Two',
    '',
    '{% endlist %}',
    '',
    'After tabs',
];

const convertAttrsToObject = ({attrs}: Token) =>
    attrs?.reduce((acc: Record<string, string>, [name, value]) => {
        acc[name] = value;

        return acc;
    }, {}) || {};

function makeTransform(params?: {transformOptions?: Partial<PluginOptions>; content?: string[]}) {
    return callPlugin(
        transform({bundle: false, ...params?.transformOptions}),
        tokenize(params?.content || defaultContent),
    );
}

describe('plugin', () => {
    test('Should convert to correct new token array', () => {
        // ACT
        const {tokens: result} = makeTransform();

        // ASSERT
        const clearJSON = JSON.parse(JSON.stringify(result.map(({attrs: _, ...item}) => item)));
        expect(clearJSON).toEqual(base);
    });

    test('Should use correct attrs', () => {
        // ARRANGE
        const attrs = ['id', 'class', 'role', 'aria-controls', 'aria-selected', 'tabindex'];

        // ACT
        const {tokens: result} = makeTransform();
        const tabs = result.filter(({type}) => type === 'tab_open');

        // ASSERT
        tabs.forEach((tab, i) => {
            const attrsObject = convertAttrsToObject(tab);

            expect(Object.keys(attrsObject)).toEqual(attrs);
            expect(attrsObject['class']).toEqual(`yfm-tab${i === 0 ? ' active' : ''}`);
            expect(attrsObject['role']).toEqual('tab');
        });
    });

    test('Tab should fit tabPanel', () => {
        // ACT
        const {tokens: result} = makeTransform();
        const tabs = result.filter(({type}) => type === 'tab_open');
        const tabPanels = result.filter(({type}) => type === 'tab-panel_open');

        // ASSERT
        expect(tabs.length).toEqual(tabPanels.length);

        tabs.forEach((tab, i) => {
            const tabPanel = tabPanels[i];
            const attrsObject = convertAttrsToObject(tab);
            const panelAttrsObject = convertAttrsToObject(tabPanel);

            expect(attrsObject['aria-controls']).toEqual(panelAttrsObject['id']);
        });
    });

    test('Tab syntax is escaped', () => {
        // ACT
        const {tokens: result} = makeTransform({
            content: ['`{% list tabs %}`'],
        });

        // ASSERT
        expect(result).toEqual(escaped);
    });

    describe('options', () => {
        test('should add an extra className to container node', () => {
            // ACT
            const {tokens: result} = makeTransform({
                transformOptions: {
                    containerClasses: 'test_1 test_2',
                },
            });

            // ASSERT
            const tabs = result.filter(({type}) => type === 'tabs_open');
            const attrsObject = convertAttrsToObject(tabs[0]);
            expect(attrsObject['class']).toEqual('yfm-tabs test_1 test_2');
        });

        test('should return the default className for container node', () => {
            // ACT
            const {tokens: result} = makeTransform();

            // ASSERT
            const tabs = result.filter(({type}) => type === 'tabs_open');
            const attrsObject = convertAttrsToObject(tabs[0]);
            expect(attrsObject['class']).toEqual('yfm-tabs');
        });

        test('should return custom runtimeJsPath and runtimeCssPath meta data', () => {
            // ACT
            const result = makeTransform({
                transformOptions: {
                    runtimeJsPath: 'path_1',
                    runtimeCssPath: 'path_2',
                },
            });

            // ASSERT
            expect(result.env).toEqual({
                meta: {
                    script: ['path_1'],
                    style: ['path_2'],
                },
            });
        });

        test('should return default runtimeJsPath and runtimeCssPath meta data', () => {
            // ACT
            const result = makeTransform();

            // ASSERT
            expect(result.env).toEqual({
                meta: {
                    script: ['_assets/tabs-extension.js'],
                    style: ['_assets/tabs-extension.css'],
                },
            });
        });
    });
});
