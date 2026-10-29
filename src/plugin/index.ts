/** Tabs extension: MarkdownIt plugin that transforms `{% list tabs %}` into tab HTML. */
export {transform} from './transform';
export type {PluginOptions, TabsPlugin, TabsDirectivePlugin, TransformOptions} from './transform';
export type {MarkdownIt, StateCore, Token} from './markdown-it';
export type {TabsDirectiveDiagnostic} from './directive';
export {recognizeTabsBoundary} from './find';
export type {TabsBoundary, TabsBoundaryToken} from './find';
