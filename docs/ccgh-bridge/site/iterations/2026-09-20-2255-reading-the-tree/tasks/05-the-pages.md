---
title: The pages
order: 5
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The pages

Move the eight routes, around six hundred lines: the home page with its board and its recent
issues, the domain page, the iteration page with its tasks, and the five leaf pages —
brainstorm, task, decision, fix, guide — plus the endpoint that serves the search index.

This is the task that makes the site a site. After it, every entry the validator accepts has a
URL, and the temporary page from task 1 is gone.

**Files**

- Create: `site/src/pages/[domain]/index.astro`
- Create: `site/src/pages/[domain]/[iteration]/index.astro`, `brainstorm.astro`, `[task].astro`
- Create: `site/src/pages/[domain]/decisions/[record].astro`
- Create: `site/src/pages/[domain]/fixes/[fix].astro`
- Create: `site/src/pages/[domain]/guide/[page].astro`
- Create: `site/src/pages/search-index.json.ts`
- Modify: `site/src/pages/index.astro` — the real home page replaces the probe
- Test: `src/docs/routes.test.ts` — every kind has a route

**Interfaces**

- Consumes: everything tasks 2, 3 and 4 produced — `entriesOf`, the six pure modules, the tokens and the seven components.
- Produces: the eight routes, and `/search-index.json`. Task 6 builds them; task 7 reads them.

- [x] **Write the failing test**

The routes are already tested as a function; what is not tested is that the function and the
directory agree. Add to `src/docs/routes.test.ts`:

```ts
it("gives every kind the validator accepts a URL", () => {
  const kinds = ["domain", "guide", "decision", "iteration", "brainstorm", "task", "fix"];
  const files = [
    "engine/index.md",
    "engine/guide/running-it.md",
    "engine/decisions/001-a.md",
    "engine/iterations/2026-01-01-0900-a/spec.md",
    "engine/iterations/2026-01-01-0900-a/brainstorm.md",
    "engine/iterations/2026-01-01-0900-a/tasks/01-a.md",
    "engine/fixes/2026-01-01-0900-a.md",
  ];

  for (const [index, file] of files.entries()) {
    const location = locate(file);

    expect(location?.kind, file).toBe(kinds[index] as string);
    expect(urlFor(location as never), file).toMatch(/^\/engine/);
  }
});
```

A kind with no route renders nothing and reports nothing, which is the failure worth a test:
the page is simply absent, and the tree links to a URL that is not built.

- [x] **Run it to verify it fails**

```bash
bun test src/docs/routes.test.ts
```

- [x] **Write the implementation**

Copy the eight pages from the origin. The home page keeps its board and its recent issues; the
domain page keeps the ordering it already has; the leaf pages keep `pathsFor` and `leafOf`.

Two changes beyond the imports, both found by building:

`site/src/leaf.ts` re-exports `slugOf` from `src/docs/leaf`, so that a page imports everything
a leaf needs from one module rather than reaching across the boundary for one function.

Three pages — the home page, the fix page and the task page — carry the origin's own GitHub
repository in a constant, to build the issue and pull request links. It comes from
`repository` in `ccgh.json` now, through `CCGH_REPOSITORY`. With no key, the number is printed
without a link and the home page leaves out its list of recent issues, because
`https://github.com//issues/3` is worse than no link at all.

`search-index.json.ts` is eight lines and stays eight lines.

Delete the probe page from task 1 by replacing it: the real `index.astro` overwrites it, and
nothing else references it.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then read the real site, which is the acceptance criterion and cannot be reached from the
suite:

```bash
./bin/ccgh docs
```

Open every kind of page at least once, in both themes: a domain, an iteration, a brainstorm,
a task, a decision, a fix, a guide. Follow the tree and the breadcrumbs rather than typing
URLs — a broken link is what this catches, and typing the URL hides it. Search for a word that
appears in one decision and confirm the palette finds it.

- [x] **Commit**
