---
title: Content model
order: 2
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Content model

Move the model itself: the seven schemas, the path parser, the loader, the validator and its
five rules, with every test that came with them. This is the largest task of the iteration by
volume and the smallest by decision — nothing here is redesigned, because nothing here was
coupled to the repository it lived in. `loadContent(root)` already took its root as an
argument.

Three things change, all mechanical, and a fourth is deliberately left alone: the imports
lose their `.js` extensions, the Vitest imports become Bun's, the files move from
`src/content-model/` to `src/model/`, and not one line of logic is touched. A logic change
hidden inside a move of nineteen hundred lines is the failure this task is most likely to
cause, so the test suite arriving green is the whole acceptance criterion.

**Files**

- Create: `src/model/schemas.ts`, `src/model/paths.ts`, `src/model/load.ts`, `src/model/validate.ts`
- Create: `src/model/rules/cycles.ts`, `naming.ts`, `references.ts`, `status.ts`, `structure.ts`
- Test: `src/model/schemas.test.ts`, `src/model/paths.test.ts`, `src/model/validate.test.ts`, and `src/model/rules/{cycles,naming,references,status,structure}.test.ts`

**Interfaces**

- Consumes: nothing from task 1 — the model takes its root as an argument and never resolves one.
- Produces: `loadContent(root: string): Promise<LoadedContent>`, `validate(content: LoadedContent): Failure[]`, `locate(file: string): ContentLocation | null`, the seven Zod schemas, and the shared patterns `SLUG`, `DATED_PREFIX`, `DATED_NAME`, `datedName`, `iterationReference`, `domainReference`. Tasks 3 to 6 import from here.

- [ ] **Write the failing test**

The tests come with the code. Copy the test files from the origin's content model directory
into `src/model/`, keeping their names and their contents, and change only:

- the import of `describe`, `expect`, `it` — and `beforeEach` where it appears — from
  `"vitest"` to `"bun:test"`;
- relative imports, dropping the `.js` extension: `from "./paths.js"` becomes `from "./paths"`.

Change nothing else. A test edited during a move stops being the thing that proves the move
was faithful.

- [ ] **Run it to verify it fails**

```bash
bun test src/model
```

Every file fails on a missing import, because the implementation is not there yet.

- [ ] **Write the implementation**

```bash
bun add zod gray-matter
```

Copy the nine implementation files from the origin, applying the same two mechanical changes
— the `.js` extensions and nothing else — and dropping `cli.ts`, whose four lines become
`src/commands/validate.ts` in the next task:

| From the origin's content model | To `src/model/` |
| --- | --- |
| `schemas.ts` | `schemas.ts` |
| `paths.ts` | `paths.ts` |
| `load.ts` | `load.ts` |
| `validate.ts` | `validate.ts` |
| `rules/cycles.ts` | `rules/cycles.ts` |
| `rules/naming.ts` | `rules/naming.ts` |
| `rules/references.ts` | `rules/references.ts` |
| `rules/status.ts` | `rules/status.ts` |
| `rules/structure.ts` | `rules/structure.ts` |
| `cli.ts` | dropped, becomes `src/commands/validate.ts` in task 3 |

`settings.test.ts` does not come across. It asserts the pinned plugin list of the repository
the code came from, which is that repository's business and not the model's.

Bun's `expect` takes the same second-argument message the tests already pass, and the
matchers in use — `toEqual`, `toBe`, `toMatch`, `toContain`, `toThrow`, `toBeGreaterThan` —
all exist. If one does not behave identically, the specification names the fallback: keep
Vitest as a devDependency and reopen the question. Do not rewrite an assertion to make it
pass.

- [ ] **Run the tests to verify they pass**

```bash
bun test
bun run typecheck
bun run lint
```

The count matters more than the result: the same number of tests must run here as ran in the
origin. Note it in the commit message so that a lost file is visible.

- [ ] **Commit**
