# Komment Feature Suite Design

## Purpose

Komment is a compatibility-first fork of the real VS Code extension Better Comments. It keeps the original comment highlighting behavior intact while adding workspace comment discovery, a dashboard, templates, theme presets, inline actions, multi-tag parsing, and optional lint diagnostics.

## Scope

This feature branch renames the extension to Komment, documents its Better Comments origin, and adds the requested feature modules:

- `src/commentCollector.ts`
- `src/dashboard.ts`
- `src/templates.ts`
- `src/themes.ts`
- `src/actions.ts`
- `src/linter.ts`

Existing highlighting remains the default experience. New features are exposed through commands, optional settings, and editor context actions.

## Architecture

`src/extension.ts` remains the activation entrypoint. It will keep the current parser/decorator lifecycle and register new services during activation:

- `Parser` continues to create decorations from configured tags.
- `commentCollector` scans documents and workspace files into a shared `CollectedComment` model.
- `dashboard` renders a VS Code webview backed by collector results.
- `templates` owns built-in comment templates and insertion UI.
- `themes` owns preset definitions and theme import/export/apply behavior.
- `actions` owns editor edit commands for the comment under the cursor or selection.
- `linter` owns optional diagnostics and rule evaluation.

The modules communicate through plain TypeScript interfaces. No module will depend on dashboard HTML internals or editor decoration state unless it needs to.

## Data Model

Collected comments use a model with:

- file URI
- workspace-relative file path
- line and character
- full matched comment text
- primary tag
- extra tags parsed from `[TAG]` and `(TAG)` segments
- priority, completion state, and author/date metadata when inferred

Multi-tag parsing will be exposed as a small helper from `parser.ts` or a parser-adjacent interface so collector, actions, and linter can share the same interpretation.

## Commands

The package will contribute the requested command surface, with twelve commands mapped to the concrete workflows:

- `komment.showDashboard`
- `komment.refreshDashboard`
- `komment.exportTodosCsv`
- `komment.exportTodosJson`
- `komment.insertTemplate`
- `komment.applyThemePreset`
- `komment.exportTheme`
- `komment.importTheme`
- `komment.convertTag`
- `komment.markCommentComplete`
- `komment.deleteComment`
- `komment.addPriority`

The original checklist asks for ten new commands, but the feature set naturally needs twelve. The implementation will keep all twelve because each maps to a concrete user workflow.

## Settings

Existing Better Comments-compatible settings stay unchanged:

- `better-comments.multilineComments`
- `better-comments.highlightPlainText`
- `better-comments.tags`

New Komment settings:

- `komment.themePreset`: one of `default`, `dark`, `light`, `colorblind`, or `codeSnippet`
- `komment.linting.enabled`: boolean, default `false`
- `komment.linting.rules`: object for enabling and configuring the five lint rules

The new settings use the `komment.*` namespace so the fork can coexist conceptually with the original extension and avoid overloading legacy setting names.

## Dashboard

The dashboard is a VS Code webview command. It scans the workspace, shows collected TODO/comment items, displays a tag distribution summary, and supports CSV/JSON export. It also listens for refresh messages so users can update results without reopening the panel.

CSV export writes columns for file, line, primary tag, extra tags, priority, completed, and text. JSON export writes the same comment model.

## Templates

Komment includes eight built-in templates:

- TODO
- FIXME
- Alert
- Query
- Note
- Hack
- Review
- Highlight

Templates support `${date}`, `${time}`, `${author}`, and `${year}`. The insertion command uses a QuickPick, computes variables at insertion time, and inserts a comment using the active document's configured line comment token when available.

## Theme Presets

Theme presets map to `better-comments.tags` values so existing highlighter behavior remains the rendering engine.

Presets:

- `default`
- `dark`
- `light`
- `colorblind`
- `codeSnippet`

The `codeSnippet` preset includes backtick-style tags with dark backgrounds. Import/export commands read and write JSON files containing tag styles.

## Inline Actions

Inline actions operate on the current line or selection:

- convert a recognized primary tag to another tag
- delete the full comment line
- mark the comment complete by changing TODO-like tags or adding a completion marker
- add priority metadata such as `[HIGH]`, `[MEDIUM]`, or `[LOW]`

Commands are available from the command palette and editor context menu. Actions should preserve indentation and surrounding code.

## Linting

Linting is disabled by default. When enabled, the linter publishes VS Code diagnostics for five configurable rules:

- require TODO comments to include metadata
- flag stale TODO comments older than a configured number of days when a date is present
- flag high priority comments without an owner
- flag FIXME comments without explanation text
- flag unknown bracket/paren tags

Rules are deterministic and run on active document changes. Diagnostics use warning severity by default.

## Documentation

`package.json`, `README.md`, and `CHANGELOG.md` will rename the project to Komment. Documentation must clearly state that Komment is a fork/extension built from the real VS Code extension Better Comments, preserving attribution instead of presenting the project as unrelated.

## Testing And Verification

Tests should cover:

- template variable replacement
- theme preset construction and import/export shapes
- multi-tag parsing for `[TAG]` and `(TAG)`
- linter rule output
- collector extraction from sample text

Verification commands:

- `npm install` when dependencies are missing
- `npm run compile`
- focused test commands when test infrastructure is available

The implementation is complete when TypeScript compiles, the new commands are contributed, documentation reflects the rename and attribution, and the original highlighting code path remains active.
