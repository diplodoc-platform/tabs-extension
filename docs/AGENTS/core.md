# Tabs extension — core concepts

## Package overview

`@diplodoc/tabs-extension` adds switchable tabs to documentation. It has three main parts:

1. **Plugin** — MarkdownIt transform that finds `{% list tabs %}` blocks and replaces them with HTML for the chosen variant.
2. **Runtime** — browser script that attaches a single `TabsController` to the document (on `window[GLOBAL_SYMBOL]`), handles click/keyboard, persistence (localStorage, URL), and events.
3. **React** — optional hook `useDiplodocTabs()` and component `TabsRuntime` to configure and restore state in a React app.

## Source layout

- **src/common.ts** — shared constants (class names, data attributes, `TabsVariants`), types (`Tab`, `SelectedTabEvent`), and `GLOBAL_SYMBOL`.
- **src/plugin/** — transform plugin: `transform.ts` (entry), `find.ts` (parse blocks), `generate.ts` (tokens), `utils/` (tabs helpers, strings, files), `variants/` (regular, radio, dropdown, accordion token generators).
- **src/runtime/** — `TabsController.ts` (DOM logic), `utils.ts` (events, scroll), `index.ts` (creates controller, imports SCSS).
- **src/react/** — `useDiplodocTabs.ts`, `TabsRuntime.ts`, re-exports from `index.ts`.

## Variants

- **regular** — horizontal tab list + panels (default).
- **radio** — vertical list with radio-style selection.
- **dropdown** — compact dropdown selector.
- **accordion** — expandable sections.

Variant is set in the block: `{% list tabs group=... radio %}`, etc. Plugin option `features.enabledVariants` can disable variants (unsupported ones fall back to regular).

## Entry points (exports)

- **Default** (`@diplodoc/tabs-extension`) — `transform` for the plugin.
- **`/runtime`** — side-effectful script + types; imports SCSS. Use once per page.
- **`/runtime/styles.css`** (or `/runtime/styles`) — CSS only.
- **`/react`** — `useDiplodocTabs`, `TabsRuntime`, types `Tab`, `UseDiplodocTabsCallback`.

## Important details

- **Single controller per document** — runtime creates one `TabsController` and stores it on `window[GLOBAL_SYMBOL]`. React hook and `TabsRuntime` use that instance; they do not check for SSR or missing runtime (see [improvement plan](../IMPROVEMENTS.md)).
- **Tab identity** — `group` (optional), `key` (from tab title / custom anchor `{#id}`), `variant`. Keys are slugified; state is persisted as `group_key` or `group_key_variant` in URL.
- **Plugin** — runs as a MarkdownIt core ruler (`before 'curly_attributes'` or `push 'tabs'`). Injects script/style paths into `env.meta` and can copy bundled runtime to output dir when `bundle: true`.

When modifying plugin code, run `npm test` (Vitest) and `npm run lint`; see [dev-infrastructure.md](dev-infrastructure.md).
