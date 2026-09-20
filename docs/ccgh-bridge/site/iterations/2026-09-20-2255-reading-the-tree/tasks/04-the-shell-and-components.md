---
title: The shell and components
order: 4
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The shell and components

Move the seven components, around nine hundred lines: the shell that wraps every page with
its sidebar and breadcrumbs, the tree, the theme toggle, the search palette, the prose
wrapper, and the two that render a board group and a task row.

One thing changes, and it is the last brand in the project. The shell's title reads
`{title} · nauvia`; it becomes the repository's name, which the command resolves and hands to
the site. Everything else is copied.

**Files**

- Create: `site/src/components/Shell.astro`, `Prose.astro`, `Tree.astro`, `ThemeToggle.astro`, `Search.astro`, `BoardGroup.astro`, `TaskRow.astro`
- Modify: `src/commands/docs.ts` — the site's name in the plan
- Modify: `src/commands/docs.test.ts` — where the name comes from
- Modify: `site/astro.config.ts` — nothing, if the name travels by environment

**Interfaces**

- Consumes: `TreeNode` from `src/docs/tree`, `BoardEntry` from `src/docs/board`, the tokens from task 3, and `searchIndexOf` through the endpoint task 5 adds.
- Produces: `Shell` with `{ title: string; crumbs: Array<{ label: string; href: string }>; tree: TreeNode[] }`, and the six components the pages compose. Task 5 uses all of them.

- [ ] **Write the failing test**

A component is not unit-testable here and pretending otherwise would produce a test that
asserts markup. What is testable is the decision the component is not allowed to make:

```ts
it("names the repository rather than the project it was extracted from", () => {
  expect(plan({ argv: [], cwd: root }).name).toBe(basename(root));
});

it("lets a repository choose another name", async () => {
  await writeFile(join(root, "ccgh.json"), '{ "title": "The harness" }', "utf8");

  expect(plan({ argv: [], cwd: root }).name).toBe("The harness");
});
```

And one that holds for the whole directory, which is the assertion that would have caught the
brand in the origin:

```ts
it("carries no name from the repository this came from", async () => {
  for (const file of await sourceFiles(join(root, "site", "src"))) {
    expect(await readFile(file, "utf8"), file).not.toMatch(/nauvia/i);
  }
});
```

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/docs.test.ts
```

- [ ] **Write the implementation**

Copy the seven components from the origin. Change two things and nothing else:
`../site/tree` becomes `../../../src/docs/tree` and the imports beside it follow; and the
title becomes `{title} · {name}`, where `name` reaches the site as `CCGH_SITE_NAME`, carrying
`configuration().title` or the repository directory's name.

`plan` gains `name`. Nothing else about the command changes.

The search palette, the theme toggle and the tree carry inline scripts. They are copied whole,
including the `is:inline` attributes, because that is what makes the theme apply before the
first paint rather than after it.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then look at it. The page from task 1 is still the bare list, so wrap it in the shell
temporarily to see the sidebar, the theme toggle and the search palette in both themes. That
temporary wrapping is thrown away in task 5, which writes the real pages.

- [ ] **Commit**
