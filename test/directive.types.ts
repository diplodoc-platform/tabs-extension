import type {MarkdownIt} from '../src/plugin/markdown-it';

import MarkdownIt15 from 'markdown-it';

import {transform} from '../src/plugin/transform';

declare const minimal: MarkdownIt;
transform()(minimal);
transform({directiveSyntax: 'disabled'})(minimal);
// @ts-expect-error Directive registration needs a real block and inline host.
transform({directiveSyntax: 'enabled'})(minimal);
// @ts-expect-error A dynamic mode can enable Directive and therefore needs the full host.
transform({directiveSyntax: Math.random() ? 'disabled' : 'enabled'})(minimal);
new MarkdownIt15().use(transform({directiveSyntax: 'enabled'}));
new MarkdownIt15().use(transform({directiveSyntax: 'only'}));
