# Shared Directive runtime

Both server plugin entries (`build/plugin/index.js` and `index-node.js`) must
load `@diplodoc/directive` as an external dependency. Directive owns module-local
symbols and a registry of opaque block boundaries. Bundling a private copy
loses the host parser's registrations even when both copies have the same version.

Acceptance examples:

- The installed archives of both entries contain an external Directive import
  and no Directive implementation in their source maps.
- A host with the table boundary registered can render an outer Cut containing
  a table with a literal `:::` cell and an inner Cut, followed by an unaffected
  sibling. Both Cuts must remain recognized after installing Tabs.
- Native markdown-it 13 and 15 hosts retain Tabs behavior, including when both
  versions are installed in the same consumer. Browser consumers can bundle the
  pure plugin and its dependency without Node adapters.

This change removes the bundled copy. Consumers still need a coherent dependency
graph resolving all participating server plugins to the boundary-capable Directive
instance. Dependency version changes and releases are separate delivery steps.

The package gate keeps its normal dependency graph check, and additionally
installs a separate consumer overriding Directive to the already published
`0.5.0-transform5.3`. A small host-owned opaque rule models a table cell containing
fence-like text and a literal closer. It checks nested container boundaries on
native markdown-it 13 and 15 through both server entries. This behavioral test
fails against the pre-fix published Tabs archive even with the same host override.
The override is restricted to the test fixture; the product dependency stays unchanged.
