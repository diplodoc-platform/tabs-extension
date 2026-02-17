# Tabs extension — dev infrastructure

## Commands

- **npm install** — install dependencies.
- **npm run build** — build plugin, runtime, and React bundles + declarations (`build/`).
- **npm run typecheck** — `tsc --noEmit`.
- **npm run lint** — `lint update && lint` (ESLint + Prettier + Stylelint via @diplodoc/lint).
- **npm run lint:fix** — apply auto-fixes.
- **npm test** — Vitest run (plugin + runtime specs).
- **npm run test:watch** — Vitest watch.
- **npm run test:coverage** — coverage report.
- **prepublishOnly** — typecheck, lint, test, build.

## Testing

- **test/plugin.spec.ts** — plugin: transform output, variants, groups, custom ids.
- **test/runtime.spec.ts** — runtime: TabsController API (selectTab, selectTabById, restore, persistence), roving tabindex, nested tabs. Uses Vitest + jsdom; HTML from MarkdownIt + plugin via `test/utils.ts` (`renderWithTabsPlugin`), no @diplodoc/transform.
- **Vitest** — config in `vitest.config.mjs`; jsdom environment for runtime tests.

## Code style

- **ESLint** — config in `.eslintrc.js` (from @diplodoc/lint). valid-jsdoc requires `@param` and `@returns` for functions. Plugin code uses TypeScript; `example/` is in .eslintignore.
- **Prettier** — formatting.
- **Stylelint** — SCSS in `src/runtime/scss/tabs.scss` (no `!important`, lowercase hex, etc.).

## Build

- **esbuild** — `esbuild/build.mjs` produces plugin, runtime, and React bundles.
- **tsc** — `tsconfig.publish.json` emits declaration files only into `build/`.
- **package.json** — `files: ["build"]`; `main`/`types` and `exports` point at `build/`.

## CI / quality

- GitHub Actions: tests, coverage (e.g. SonarCloud), release, security, dependency updates.
- Pre-commit (Husky): lint-staged and commit-msg hooks.

When adding features or fixing bugs, keep tests and JSDoc in sync; run `npm run lint` and `npm test` before pushing.
