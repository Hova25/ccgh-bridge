---
title: The pure modules
order: 2
issue: 52
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The pure modules

Move the six modules that decide what the site shows: the URL of an entry, the navigation
tree, the board, the recent issues, the search index, and the leaf a page renders. Around nine
hundred lines, five of them arriving with the tests they already have.

None of them import anything from Astro, which is why they live under `src/` with the engine
and are run by `bun test` rather than inside the site. `entries.ts` is the one that does touch
`astro:content`, and it stays in the Astro project; it is the boundary, and it returns the
engine's own `ParsedEntry` so that everything downstream of it is testable without a browser.

**Files**

- Create: `src/docs/routes.ts`, `tree.ts`, `board.ts`, `recent.ts`, `search-index.ts`, `leaf.ts`
- Create: `site/src/entries.ts`
- Test: `src/docs/routes.test.ts`, `tree.test.ts`, `board.test.ts`, `recent.test.ts`, `search-index.test.ts`, `leaf.test.ts`

**Interfaces**

- Consumes: `ContentLocation` and `locate` from `src/model/paths`, `ParsedEntry` from `src/model/validate`, and the collections task 1 declared.
- Produces: `urlFor(location): string` and `breadcrumbFor(location)` from `routes`; `treeOf({ entries })` and `type TreeNode` from `tree`; `boardOf({ entries })`, `type Board` and `type BoardEntry` from `board`; `recentIssues({ … })` and `type RecentIssue` from `recent`; `searchIndexOf({ entries })`, `matches({ … })` and `type SearchRecord` from `search-index`; `pathsFor({ … })`, `leafOf({ file })` and `slugOf(location)` from `leaf`; and `entriesOf(): Promise<ParsedEntry[]>` from `site/src/entries.ts`. Tasks 4 and 5 consume all of them.

- [ ] **Write the failing test**

Five tests come with the code. Copy `routes.test.ts`, `tree.test.ts`, `board.test.ts`,
`recent.test.ts` and `search-index.test.ts` from the origin's site modules into `src/docs/`,
changing only the `vitest` import to `bun:test` and the import paths, which now point at
`../model/` rather than at a content model beside them.

`leaf.ts` has no test in the origin, and the pages depend on it. Write the one it never had:

```ts
import { describe, expect, it } from "bun:test";
import { locate } from "../model/paths";
import { slugOf } from "./leaf";

describe("slugOf", () => {
  it("is the file name of a decision, without its extension", () => {
    const location = locate("engine/decisions/001-commit-the-configuration.md");

    expect(slugOf(location as never)).toBe("001-commit-the-configuration");
  });

  it("is the file name of a task, so two iterations may both hold an 01", () => {
    const location = locate("engine/iterations/2026-01-01-0900-a/tasks/01-first.md");

    expect(slugOf(location as never)).toBe("01-first");
  });
});
```

- [ ] **Run it to verify it fails**

```bash
bun test src/docs
```

Six files fail on a module that is not there.

- [ ] **Write the implementation**

Copy the six modules from the origin, with the import paths as the only change. Not one line
of logic is touched: a behaviour change hidden inside a move of nine hundred lines is the
failure this task is most likely to cause, and the suite arriving green is the whole
acceptance criterion.

`site/src/entries.ts` is the origin's, with `../content-model/` becoming `../../src/model/`.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then diff each moved file against its origin and confirm the only differences are import
lines. Verify by diff rather than by trust.

- [ ] **Commit**
