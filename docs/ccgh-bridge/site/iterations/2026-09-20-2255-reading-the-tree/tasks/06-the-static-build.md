---
title: The static build
order: 6
issue: 56
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The static build

`ccgh docs --build` writes the site a repository can publish, and refuses to write one whose
links would be dead.

That refusal is the whole task. A site built with the wrong base works perfectly on the
machine that built it and breaks the moment it is published, with every link pointing one
directory too high — the kind of failure that is discovered by a reader rather than by its
author.

**Files**

- Modify: `src/commands/docs.ts` — `site` and `base` in the plan, and the refusal
- Modify: `src/commands/docs.test.ts`
- Modify: `src/configuration.ts` — the `site` key
- Modify: `src/configuration.test.ts`
- Modify: `site/astro.config.ts` — `site` and `base`
- Modify: `README.md` — the key, and what it is for

**Interfaces**

- Consumes: `plan` and `run` from task 1, and the pages from task 5.
- Produces: `type Configuration` gains `site?: string`; `plan` gains `site` and `base`. Task 7 uses neither — this is where the iteration's last external decision lands.

- [ ] **Write the failing test**

```ts
it("refuses to build a site whose links would be dead", async () => {
  expect(await run({ argv: ["--build"], cwd: root })).toBe(1);
});

it("says which key is missing, so the refusal is actionable", async () => {
  expect(() => plan({ argv: ["--build"], cwd: root })).toThrow(/site.*ccgh\.json/);
});

it("takes the base from the path of the site it was given", async () => {
  await writeFile(join(root, "ccgh.json"), '{ "site": "https://x.github.io/repo" }', "utf8");

  const built = plan({ argv: ["--build"], cwd: root });

  expect(built.site).toBe("https://x.github.io/repo");
  expect(built.base).toBe("/repo/");
});

it("takes no base from a site published at a domain root", async () => {
  await writeFile(join(root, "ccgh.json"), '{ "site": "https://docs.example.com" }', "utf8");

  expect(plan({ argv: ["--build"], cwd: root }).base).toBe("/");
});

it("asks for nothing when it is only serving", () => {
  expect(plan({ argv: [], cwd: root }).site).toBeUndefined();
});
```

The last one matters as much as the first: requiring the key to read the site locally would
make every repository configure something before it could read anything, and reading is the
common case.

- [ ] **Run it to verify it fails**

```bash
bun test src/commands/docs.test.ts
```

- [ ] **Write the implementation**

`plan` computes `base` from the URL's path — `new URL(site).pathname`, normalised to end with
a slash, or `/` when there is none. `run` catches the refusal and returns 1 with the message
on stderr, rather than letting it reach the user as a stack trace.

`astro.config.ts` reads `CCGH_SITE` and `CCGH_BASE`, both absent when serving.

The README gains `site` beside the keys it already documents, with the sentence that says why
it is required for a build and not for a read.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then build this repository's own site and read it from a file server, not from Astro:

```bash
./bin/ccgh docs --build
bunx serve .ccgh/site
```

Follow the tree and the breadcrumbs. A base that is wrong shows up here and nowhere else, and
it shows up as a link that lands on a missing page rather than as an error.

Confirm `.ccgh/` is ignored by git. A repository that commits its built site does it once.

- [ ] **Commit**
