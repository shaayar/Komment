# Komment Feature Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename Better Comments to Komment and add the compatibility-first dashboard, templates, themes, actions, multi-tag parsing, collector, and optional linting features.

**Architecture:** Keep the existing `Parser` decoration path active and add focused modules around it. Pure helper logic lives in testable functions; VS Code-facing modules register commands, webviews, diagnostics, and editor edits through `extension.ts`.

**Tech Stack:** TypeScript, VS Code extension API, Node `assert` for focused unit tests, existing `tsc` compilation.

---

## File Structure

- Create `src/commentModel.ts`: shared interfaces and pure helpers for collected comments, tags, CSV, JSON, and comment text parsing.
- Modify `src/parser.ts`: export multi-tag parsing helpers and preserve existing decoration methods.
- Create `src/commentCollector.ts`: workspace and document scanning.
- Create `src/templates.ts`: built-in templates, variable expansion, and QuickPick insertion command.
- Create `src/themes.ts`: preset definitions and import/export/apply helpers.
- Create `src/linter.ts`: configurable lint rules and VS Code diagnostics registration.
- Create `src/actions.ts`: editor actions for convert, delete, complete, and priority commands.
- Create `src/dashboard.ts`: dashboard webview, refresh, distribution display, and export wiring.
- Modify `src/extension.ts`: instantiate/register the new modules while keeping highlighting unchanged.
- Modify `src/typings/typings.d.ts`: add shared config types for Komment settings.
- Modify `package.json`: rename to Komment, add commands, menus, settings, and scripts.
- Modify `README.md` and `CHANGELOG.md`: rename and document Better Comments attribution.
- Create `src/test/unit.ts`: pure unit tests for parser/model/template/theme/linter helpers.

---

### Task 1: Unit Test Harness And Shared Model

**Files:**
- Create: `src/commentModel.ts`
- Create: `src/test/unit.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing tests**

Create `src/test/unit.ts`:

```typescript
import * as assert from 'assert';
import {
    buildTagDistribution,
    commentsToCsv,
    extractMetadataTags,
    replaceTemplateVariables
} from '../commentModel';

function testExtractMetadataTags(): void {
    const result = extractMetadataTags('// TODO [urgent] Fix bug (HIGH)');
    assert.strictEqual(result.primaryTag, 'TODO');
    assert.deepStrictEqual(result.extraTags, ['urgent', 'HIGH']);
    assert.strictEqual(result.priority, 'HIGH');
}

function testTemplateVariables(): void {
    const rendered = replaceTemplateVariables(
        'TODO ${date} ${time} ${author} ${year}',
        {
            date: '2026-05-26',
            time: '10:30',
            author: 'Higan',
            year: '2026'
        }
    );
    assert.strictEqual(rendered, 'TODO 2026-05-26 10:30 Higan 2026');
}

function testDistributionAndCsv(): void {
    const comments = [
        {
            uri: 'file:///repo/a.ts',
            filePath: 'a.ts',
            line: 2,
            character: 4,
            text: '// TODO [HIGH] one',
            primaryTag: 'TODO',
            extraTags: ['HIGH'],
            priority: 'HIGH',
            completed: false
        },
        {
            uri: 'file:///repo/b.ts',
            filePath: 'b.ts',
            line: 8,
            character: 0,
            text: '// FIXME two',
            primaryTag: 'FIXME',
            extraTags: [],
            completed: false
        }
    ];

    assert.deepStrictEqual(buildTagDistribution(comments), { TODO: 1, FIXME: 1 });
    assert.strictEqual(
        commentsToCsv(comments),
        'file,line,character,primaryTag,extraTags,priority,completed,text\n' +
        '"a.ts",2,4,"TODO","HIGH","HIGH",false,"// TODO [HIGH] one"\n' +
        '"b.ts",8,0,"FIXME","","",false,"// FIXME two"'
    );
}

testExtractMetadataTags();
testTemplateVariables();
testDistributionAndCsv();

console.log('Komment unit tests passed');
```

- [ ] **Step 2: Add the unit test script**

In `package.json`, add:

```json
"test:unit": "npm run compile && node out/test/unit.js"
```

- [ ] **Step 3: Run the test and verify it fails**

Run: `npm run test:unit`

Expected before implementation: TypeScript fails because `src/commentModel.ts` and its exported functions do not exist.

- [ ] **Step 4: Implement the shared model**

Create `src/commentModel.ts` with exported interfaces:

```typescript
export interface CollectedComment {
    uri: string;
    filePath: string;
    line: number;
    character: number;
    text: string;
    primaryTag: string;
    extraTags: string[];
    priority?: string;
    completed: boolean;
    author?: string;
    date?: string;
}

export interface TemplateVariables {
    date: string;
    time: string;
    author: string;
    year: string;
}
```

Add pure functions:

```typescript
export function extractMetadataTags(text: string): {
    primaryTag: string;
    extraTags: string[];
    priority?: string;
    completed: boolean;
}
```

The function must:

- detect the first word-like or symbol tag after a comment delimiter;
- collect `[TAG]` and `(TAG)` values in order;
- set priority when one extra tag is `HIGH`, `MEDIUM`, `LOW`, `URGENT`, or `P0` through `P3`;
- set completed when text contains `[done]`, `[complete]`, `(done)`, `(complete)`, or primary tag `DONE`.

Add:

```typescript
export function replaceTemplateVariables(template: string, variables: TemplateVariables): string
export function buildTagDistribution(comments: CollectedComment[]): { [tag: string]: number }
export function commentsToCsv(comments: CollectedComment[]): string
export function commentsToJson(comments: CollectedComment[]): string
```

- [ ] **Step 5: Run tests and commit**

Run: `npm run test:unit`

Expected after implementation: compile succeeds and prints `Komment unit tests passed`.

Commit:

```bash
git add package.json src/commentModel.ts src/test/unit.ts
git commit -m "test: add Komment unit model coverage"
```

---

### Task 2: Multi-Tag Parser Integration

**Files:**
- Modify: `src/parser.ts`
- Modify: `src/test/unit.ts`

- [ ] **Step 1: Add failing parser coverage**

In `src/test/unit.ts`, add an assertion that `parseKommentTags('// TODO [urgent] Fix bug [HIGH]')` returns primary tag `TODO`, extra tags `urgent` and `HIGH`, and priority `HIGH`.

- [ ] **Step 2: Run RED**

Run: `npm run test:unit`

Expected: compile fails because `parseKommentTags` is not exported.

- [ ] **Step 3: Implement parser helper**

In `src/parser.ts`, export:

```typescript
import { extractMetadataTags } from './commentModel';

export function parseKommentTags(text: string) {
    return extractMetadataTags(text);
}
```

Keep all existing `Parser` class methods and decoration behavior unchanged.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm run test:unit`

Commit:

```bash
git add src/parser.ts src/test/unit.ts
git commit -m "feat: expose Komment multi-tag parsing"
```

---

### Task 3: Comment Collector

**Files:**
- Create: `src/commentCollector.ts`
- Modify: `src/test/unit.ts`

- [ ] **Step 1: Add failing collector tests**

Add tests for a pure `collectCommentsFromText` helper that scans sample TypeScript text containing `TODO`, `FIXME`, `[HIGH]`, and `(owner)` metadata.

- [ ] **Step 2: Run RED**

Run: `npm run test:unit`

Expected: compile fails because `collectCommentsFromText` does not exist.

- [ ] **Step 3: Implement collector**

Create `src/commentCollector.ts` with:

```typescript
export function collectCommentsFromText(uri: string, filePath: string, text: string): CollectedComment[]
export async function collectWorkspaceComments(): Promise<CollectedComment[]>
export async function collectDocumentComments(document: vscode.TextDocument): Promise<CollectedComment[]>
```

The pure text helper scans line-by-line for supported primary tags and uses `extractMetadataTags`. Workspace scanning uses `vscode.workspace.findFiles('**/*', '**/{node_modules,.git,out}/**')`, opens text documents, and collects matches.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm run test:unit`

Commit:

```bash
git add src/commentCollector.ts src/test/unit.ts
git commit -m "feat: collect Komment workspace comments"
```

---

### Task 4: Templates

**Files:**
- Create: `src/templates.ts`
- Modify: `src/test/unit.ts`

- [ ] **Step 1: Add failing template tests**

Assert that `getBuiltInTemplates()` returns exactly eight templates named TODO, FIXME, Alert, Query, Note, Hack, Review, and Highlight. Assert template rendering replaces all four variables.

- [ ] **Step 2: Run RED**

Run: `npm run test:unit`

Expected: compile fails because `src/templates.ts` does not exist.

- [ ] **Step 3: Implement templates**

Create `src/templates.ts` with:

```typescript
export interface CommentTemplate {
    label: string;
    description: string;
    body: string;
}

export function getBuiltInTemplates(): CommentTemplate[]
export function buildTemplateVariables(authorOverride?: string, now?: Date): TemplateVariables
export function renderTemplate(template: CommentTemplate, variables: TemplateVariables): string
export function registerTemplateCommands(context: vscode.ExtensionContext): void
```

The command `komment.insertTemplate` uses `vscode.window.showQuickPick`, renders the selected template, and inserts a line comment in the active editor.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm run test:unit`

Commit:

```bash
git add src/templates.ts src/test/unit.ts
git commit -m "feat: add Komment smart templates"
```

---

### Task 5: Theme Presets

**Files:**
- Create: `src/themes.ts`
- Modify: `src/test/unit.ts`

- [ ] **Step 1: Add failing theme tests**

Assert `getThemePreset('codeSnippet')` includes a backtick tag and at least one dark background, and that `getThemePresetNames()` returns default, dark, light, colorblind, and codeSnippet.

- [ ] **Step 2: Run RED**

Run: `npm run test:unit`

Expected: compile fails because theme helpers do not exist.

- [ ] **Step 3: Implement themes**

Create `src/themes.ts` with preset definitions matching Better Comments tag style objects. Add commands:

- `komment.applyThemePreset`
- `komment.exportTheme`
- `komment.importTheme`

Applying a preset updates `better-comments.tags` and `komment.themePreset`.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm run test:unit`

Commit:

```bash
git add src/themes.ts src/test/unit.ts
git commit -m "feat: add Komment theme presets"
```

---

### Task 6: Linter

**Files:**
- Create: `src/linter.ts`
- Modify: `src/test/unit.ts`

- [ ] **Step 1: Add failing linter tests**

Assert pure `lintCollectedComments` flags FIXME without explanation, high priority without owner, unknown metadata tags, stale dated TODOs, and TODO comments missing metadata.

- [ ] **Step 2: Run RED**

Run: `npm run test:unit`

Expected: compile fails because linter helpers do not exist.

- [ ] **Step 3: Implement linter**

Create `src/linter.ts` with:

```typescript
export interface KommentLintRuleConfig {
    requireTodoMetadata: boolean;
    staleTodoDays: number;
    requireOwnerForHighPriority: boolean;
    requireFixmeExplanation: boolean;
    allowedMetadataTags: string[];
}

export function getDefaultLintRuleConfig(): KommentLintRuleConfig
export function lintCollectedComments(comments: CollectedComment[], config: KommentLintRuleConfig, now?: Date): KommentLintFinding[]
export function registerLinter(context: vscode.ExtensionContext): void
```

`registerLinter` creates a `DiagnosticCollection` and exits early unless `komment.linting.enabled` is true.

- [ ] **Step 4: Run GREEN and commit**

Run: `npm run test:unit`

Commit:

```bash
git add src/linter.ts src/test/unit.ts
git commit -m "feat: add optional Komment linting"
```

---

### Task 7: Inline Actions

**Files:**
- Create: `src/actions.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Implement command module**

Create `src/actions.ts` with:

```typescript
export function registerCommentActions(context: vscode.ExtensionContext): void
```

Register `komment.convertTag`, `komment.deleteComment`, `komment.markCommentComplete`, and `komment.addPriority`. Use `TextEditor.edit` against the active line or selection. Convert tag via QuickPick; priority via QuickPick with HIGH, MEDIUM, LOW.

- [ ] **Step 2: Wire activation**

In `src/extension.ts`, import and call `registerCommentActions(context)` inside `activate`.

- [ ] **Step 3: Compile and commit**

Run: `npm run compile`

Commit:

```bash
git add src/actions.ts src/extension.ts
git commit -m "feat: add Komment inline comment actions"
```

---

### Task 8: Dashboard And Export Commands

**Files:**
- Create: `src/dashboard.ts`
- Modify: `src/extension.ts`

- [ ] **Step 1: Implement dashboard module**

Create `src/dashboard.ts` with:

```typescript
export function registerDashboardCommands(context: vscode.ExtensionContext): void
```

Register:

- `komment.showDashboard`
- `komment.refreshDashboard`
- `komment.exportTodosCsv`
- `komment.exportTodosJson`

The webview renders a table and distribution list from `collectWorkspaceComments()`. Export commands call `commentsToCsv` and `commentsToJson`, then write to a user-selected URI with `vscode.workspace.fs.writeFile`.

- [ ] **Step 2: Wire activation**

In `src/extension.ts`, import and call `registerDashboardCommands(context)`.

- [ ] **Step 3: Compile and commit**

Run: `npm run compile`

Commit:

```bash
git add src/dashboard.ts src/extension.ts
git commit -m "feat: add Komment dashboard and exports"
```

---

### Task 9: Package Contributions And Rename

**Files:**
- Modify: `package.json`
- Modify: `src/typings/typings.d.ts`

- [ ] **Step 1: Update metadata**

Set:

```json
"name": "komment",
"displayName": "Komment",
"description": "A Better Comments-based VS Code extension for highlighted comments, TODO dashboards, templates, themes, actions, and linting."
```

- [ ] **Step 2: Add command and menu contributions**

Add command contributions for all twelve `komment.*` commands and editor context menu entries for convert, mark complete, delete, and add priority.

- [ ] **Step 3: Add settings**

Add:

```json
"komment.themePreset": {
  "type": "string",
  "enum": ["default", "dark", "light", "colorblind", "codeSnippet"],
  "default": "default"
},
"komment.linting.enabled": {
  "type": "boolean",
  "default": false
},
"komment.linting.rules": {
  "type": "object",
  "default": {
    "requireTodoMetadata": true,
    "staleTodoDays": 30,
    "requireOwnerForHighPriority": true,
    "requireFixmeExplanation": true,
    "allowedMetadataTags": ["HIGH", "MEDIUM", "LOW", "URGENT", "P0", "P1", "P2", "P3", "owner", "done", "complete"]
  }
}
```

- [ ] **Step 4: Compile and commit**

Run: `npm run compile`

Commit:

```bash
git add package.json src/typings/typings.d.ts
git commit -m "feat: contribute Komment commands and settings"
```

---

### Task 10: Documentation And Final Verification

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update README**

Rename the heading to Komment. Add attribution:

```markdown
Komment is a fork and extension of the real VS Code extension Better Comments by Aaron Bond. It preserves the original highlighting idea and adds dashboard, template, theme, action, multi-tag, and linting workflows.
```

Document commands, settings, templates, presets, linting disabled by default, and export behavior.

- [ ] **Step 2: Update CHANGELOG**

Add an unreleased entry for the Komment rename and feature suite, including Better Comments attribution.

- [ ] **Step 3: Final verification**

Run:

```bash
npm run test:unit
npm run compile
git status --short
```

Expected:

- unit tests pass;
- TypeScript compiles with zero errors;
- only intended files are modified or all changes are committed.

- [ ] **Step 4: Commit docs**

Commit:

```bash
git add README.md CHANGELOG.md
git commit -m "docs: rename project to Komment"
```

