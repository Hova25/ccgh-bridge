---
title: The styles
order: 3
issue: 53
github:
  state: closed
  pr: null
  merged_at: null
  synced_at: '2026-09-21T00:10:55.439Z'
---

# The styles

Move the two stylesheets and the thing that makes them unusual: a test that reads the tokens
out of the CSS and asserts every foreground-on-background pair clears its contrast ratio, in
both themes, by computing the ratio rather than by eye.

That test is why the design crosses unchanged rather than being redrawn. A palette nobody
measured is a palette that drifts one comfortable-looking commit at a time, and this one is
measured.

**Files**

- Create: `site/src/styles/tokens.css`, `site/src/styles/base.css`
- Create: `src/docs/contrast.ts`
- Test: `src/docs/contrast.test.ts`, `src/docs/tokens.test.ts`

**Interfaces**

- Consumes: nothing.
- Produces: `ratioOf({ foreground, background }): number` from `src/docs/contrast.ts`, and the custom properties every component in task 4 uses — `--surface`, `--surface-side`, `--surface-raised`, `--surface-hover`, `--surface-current`, `--border`, `--rail`, `--text`, `--text-muted`, `--text-section`, `--accent`, `--warn`, `--focus`.

- [ ] **Write the failing test**

Both tests come with the code. Copy `contrast.test.ts` and `tokens.test.ts` from the origin,
changing the `vitest` import and, in `tokens.test.ts`, the two paths it reads: the stylesheet
it parses and the directory it walks looking for `.astro` and `.css` files. Both now point at
`site/src/`, which is above the test rather than beside it:

```ts
const tokensPath = new URL("../../site/src/styles/tokens.css", import.meta.url);
const sourceRoot = fileURLToPath(new URL("../../site/src", import.meta.url));
```

That crossing is the one thing in this task worth reviewing. The test lives with the engine
because `bun test` runs there; the stylesheet lives with the site because Astro serves it.

- [ ] **Run it to verify it fails**

```bash
bun test src/docs/contrast.test.ts src/docs/tokens.test.ts
```

`contrast.test.ts` fails on a missing module. `tokens.test.ts` fails on a missing stylesheet,
which is the more interesting failure: it proves the test is reading the file rather than a
copy of the values.

- [ ] **Write the implementation**

Copy `contrast.ts`, `tokens.css` and `base.css` from the origin, unchanged. No token is
renamed, no value is adjusted, and no ratio is relaxed to make a test pass — a failing
contrast test means the value is wrong, not the threshold.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

The page from task 1 is unstyled until task 4 imports these, and that is expected. What this
task delivers is the measured palette, not its use.

- [ ] **Commit**
