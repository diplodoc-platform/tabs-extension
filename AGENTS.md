# AGENTS.md

This file contains instructions for AI agents working with the `@diplodoc/tabs-extension` project.

## Common Rules and Standards

**Important**: This package follows common rules and standards defined in the Diplodoc metapackage. When working in metapackage mode, refer to:

- **`.agents/style-and-testing.md`** in the metapackage root for:
  - Code style guidelines
  - **Language requirements** (commit messages, comments, docs MUST be in English)
  - Commit message format (Conventional Commits)
  - Pre-commit hooks rules (**CRITICAL**: Never commit with `--no-verify`)
  - Testing standards
  - Documentation requirements
- **`.agents/core.md`** for core concepts
- **`.agents/monorepo.md`** for workspace and dependency management
- **`.agents/dev-infrastructure.md`** for build and CI/CD

**Note**: In standalone mode (when this package is used independently), these rules still apply. If you need to reference the full documentation, check the [Diplodoc metapackage repository](https://github.com/diplodoc-platform/diplodoc).

## Project Description

`@diplodoc/tabs-extension` is a Diplodoc platform extension that provides switchable tabs in documentation. It includes a MarkdownIt transform plugin, a browser runtime component, and React integration for interactive tab behavior.

**Key Features**:

- MarkdownIt transform plugin for processing tab directives in YFM
- Browser runtime component for interactive tab behavior (switch, synchronization)
- React component and hooks for React-based applications
- SCSS styles for tab appearance
- Support for multiple tab variants (regular, radio, dropdown, accordion)
- Tab synchronization across groups
- URL hash navigation and state persistence (localStorage, query params)

**Primary Use Case**: Enables documentation authors to create switchable tab groups that allow users to view different content sections within the same space, improving content organization and user experience.

## Project Structure

### Main Directories

- `src/` — source code
  - `plugin/` — MarkdownIt transform plugin
    - Core plugin implementation and transformation logic
    - Tab parsing and generation
    - Variant implementations (regular, radio, dropdown, accordion)
    - Utility functions for files, strings, and tabs
  - `runtime/` — browser runtime component
    - Runtime entry point and controller
    - Tab synchronization logic
    - URL hash navigation
    - State persistence utilities
    - Styles (SCSS) for tabs
  - `react/` — React integration
    - `TabsRuntime` component for easy installation
    - `useDiplodocTabs` hook for programmatic control
    - TypeScript types for React integration
- `tests/` — test suite (separate package)
  - Unit tests for plugin functionality
  - Runtime tests for tab behavior
  - Snapshot tests for HTML output
- `build/` — compiled output (generated)
  - `plugin/` — compiled plugin code
  - `runtime/` — compiled runtime code
  - `react/` — compiled React code
- `esbuild/` — build configuration
  - esbuild configuration for bundling
- `example/` — usage examples (separate package)

### Configuration Files

- `package.json` — package metadata and dependencies
- `tsconfig.json` — TypeScript configuration (development)
- `tsconfig.publish.json` — TypeScript configuration (for publishing)
- `CHANGELOG.md` — change log (managed by release-please)
- `CONTRIBUTING.md` — contribution guidelines

## Tech Stack

This package follows the standard Diplodoc platform tech stack. See `.agents/dev-infrastructure.md` and `.agents/style-and-testing.md` in the metapackage root for detailed information.

**Package-specific details**:

- **Language**: TypeScript
- **Build**: esbuild for bundling, tsc for type declarations
- **Testing**: Vitest (migrated from Jest)
- **Styling**: SCSS (compiled to CSS)
- **Dependencies**: None (peer dependencies only)
- **Peer Dependencies**:
  - `react` (optional) — for React integration
- **Dev Dependencies**:
  - `@diplodoc/lint` — linting infrastructure
  - `@diplodoc/tsconfig` — TypeScript configuration
  - `esbuild` — fast bundler
  - `esbuild-sass-plugin` — SCSS compilation
  - `markdown-it` — Markdown parser (for testing)
  - `github-slugger` — slug generation for tab keys
  - `vitest` — unit testing framework

## Usage Modes

This package can be used in two different contexts:

### 1. As Part of Metapackage (Workspace Mode)

When `@diplodoc/tabs-extension` is part of the Diplodoc metapackage:

- Located at `extensions/tabs/` in the metapackage
- Linked via npm workspaces
- Dependencies are shared from metapackage root `node_modules`
- Can be developed alongside other packages
- Changes are immediately available to other packages via workspace linking

**Development in Metapackage**:

```bash
# From metapackage root
cd extensions/tabs

# Install dependencies (from root)
npm install

# Build package
npm run build

# Run unit tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

### 2. Standalone Mode

When `@diplodoc/tabs-extension` is used as a standalone npm package:

- Installed via `npm install @diplodoc/tabs-extension`
- All dependencies must be installed locally
- Can be used in any Node.js or React project

**Usage in Standalone Mode**:

```bash
# Install
npm install @diplodoc/tabs-extension

# Use in code
import tabsExtension from '@diplodoc/tabs-extension';
import '@diplodoc/tabs-extension/runtime';
```

## Build System

This package uses **esbuild** for bundling JavaScript and TypeScript, and **TypeScript compiler (tsc)** for generating type declarations.

### Build Process

1. **`build:js`** — Bundles plugin, runtime, and React code using esbuild
   - Outputs to `build/plugin/`, `build/runtime/`, and `build/react/`
   - Compiles TypeScript and SCSS
   - Creates ESM and CJS bundles

2. **`build:declarations`** — Generates TypeScript declaration files
   - Uses `tsc` with `tsconfig.publish.json`
   - Outputs `.d.ts` files to `build/`

3. **`build`** — Runs both build steps in parallel

### Build Outputs

- `build/plugin/` — Compiled plugin code (ESM and CJS)
- `build/runtime/` — Compiled runtime code and styles (CSS)
- `build/react/` — Compiled React component and hooks (ESM and CJS)

## Extension Integration

This extension integrates with `@diplodoc/transform` as a plugin:

```typescript
import tabsExtension from '@diplodoc/tabs-extension';
import transformYfm from '@diplodoc/transform';

const {result} = transformYfm(markup, {
    plugins: [tabsExtension.transform({bundle: false})],
});
```

The extension provides:
- Plugin transform function for MarkdownIt
- Runtime scripts and styles via `@diplodoc/tabs-extension/runtime`
- React component and hooks via `@diplodoc/tabs-extension/react`
- TypeScript types for options

## Testing

The package has unit tests in the `tests/` directory (separate package):

- **Location**: `tests/` directory (separate `package.json`)
- **Framework**: Vitest
- **Test files**: `*.test.ts`
- **Snapshots**: HTML output snapshots in `__snapshots__/`

**Test Commands**:

```bash
# Run unit tests
npm test

# Run tests in watch mode
cd tests && npm test -- --watch
```

**Test Structure**:

- Tests for tab markup parsing
- Tests for variant generation (regular, radio, dropdown, accordion)
- Tests for HTML rendering
- Tests for tab synchronization and state management
- Runtime tests for interactive behavior
- Snapshot tests for HTML output

## Linting and Code Quality

Linting is configured via `@diplodoc/lint`:

- ESLint for JavaScript/TypeScript
- Prettier for code formatting
- Stylelint for SCSS
- Git hooks via Husky
- Pre-commit checks via lint-staged

Configuration files are automatically managed by `@diplodoc/lint`:
- `.eslintrc.js`
- `.prettierrc.js`
- `.stylelintrc.js`
- `.editorconfig`
- `.lintstagedrc.js`
- `.husky/pre-commit`
- `.husky/commit-msg`

**Lint Commands**:

```bash
# Update lint configurations
npm run lint

# Fix linting issues
npm run lint:fix

# Pre-commit hook (runs automatically)
npm run pre-commit
```

## Important Notes

1. **Metapackage vs Standalone**: This package can be used both as part of the metapackage (workspace mode) and as a standalone npm package. All scripts must work in both contexts.

2. **Tests Directory**: Tests are in a separate `tests/` directory with its own `package.json`. When running tests, ensure dependencies are installed in the `tests/` directory.

3. **Build Outputs**: The package builds to `build/` directory. This directory should be excluded from version control and TypeScript type checking.

4. **React Integration**: React is an optional peer dependency. The React components and hooks are only available when React is installed. The runtime works independently of React.

5. **package.json Maintenance**: Periodically check that `package.json` fields (description, repository URL, bugs URL, etc.) are accurate and up-to-date. Verify that dependency versions are current and compatible with the project standards.

## CI/CD

The package includes GitHub Actions workflows:

- **tests.yml**: Runs tests and linting
- **release.yml**: Publishes package to npm when a release is created
- **release-please.yml**: Automated versioning and changelog management
- **package-lock.yml**: Updates package-lock.json
- **update-deps.yml**: Updates dependencies
- **security.yml**: Security audits

### Release Process

The package uses **release-please** for automated versioning and publishing:

1. **Release-please workflow** (if configured):
   - Runs on push to `master`
   - Analyzes conventional commits to determine version bumps
   - Creates release PRs with updated version and CHANGELOG.md

2. **Publish workflow** (`.github/workflows/release.yml`):
   - Triggers automatically when a release is created
   - Runs tests and build
   - Publishes to npm with provenance

**Version Bump Rules**:
- `feat`: Minor version bump
- `fix`: Patch version bump
- Breaking changes (e.g., `feat!: breaking change`): Major version bump
- `chore`, `docs`, `refactor`: No version bump (unless breaking)

## GitHub Integration

- **Issue templates**: Bug reports and feature requests (`.github/ISSUE_TEMPLATE/`)
- **Pull request template**: Standardized PR format (`.github/pull_request_template.md`)
- **CODEOWNERS**: Code ownership configuration (`CODEOWNERS`)

## Documentation Files

- **README.md**: Package documentation with usage examples
- **CHANGELOG.md**: Change log (managed by release-please)
- **CONTRIBUTING.md**: Contribution guidelines and development workflow
- **AGENTS.md**: This file - guide for AI coding agents
- **LICENSE**: MIT license

## Additional Resources

- Metapackage `.agents/` - Platform-wide agent documentation
- `@diplodoc/lint` documentation - Linting and formatting setup
- `@diplodoc/tsconfig` - TypeScript configuration reference
- React documentation - For React integration usage
