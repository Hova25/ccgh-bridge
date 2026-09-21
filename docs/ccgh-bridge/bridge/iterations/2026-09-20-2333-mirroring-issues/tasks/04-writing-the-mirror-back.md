---
title: Writing the mirror back
order: 4
issue: 37
github:
  state: closed
  pr: null
  merged_at: null
  synced_at: '2026-09-21T00:10:39.086Z'
---

# Writing the mirror back

The half that edits files. `mirror` writes an issue number, a pull request number, a state or
a `shipped` status into front matter without disturbing anything else. `iteration-branch`
commits those edits onto the branch the iteration lives on, which is almost never the branch
the bridge is running from.

That second one is the subtle piece. A workflow reacting to a closed issue runs on `main`, and
the file it must edit belongs to a branch that may already be merged, may have moved, or may
not exist — in which case the write arrives as `bot/ship/<reference>`, a pull request for a
human to merge.

**Files**

- Create: `src/bridge/mirror.ts`, `src/bridge/iteration-branch.ts`
- Test: `src/bridge/mirror.test.ts`, `src/bridge/iteration-branch.test.ts`, `src/bridge/iteration-branch.integration.test.ts`

**Interfaces**

- Consumes: `contentRoot` from `src/project`, and `ParsedEntry`.
- Produces: `writeIssueNumbers`, `writePullRequest`, `writeMirror`, `markShipped`, `writeCompletion` from `mirror`; `commitToIterationBranch`, `shipBranchFor`, `shellIn`, `shell` from `iteration-branch`. Tasks 5 to 8 use them.

- [x] **Write the failing test**

Three tests come with the code, and the third runs real git in a temporary repository. Copy
them with the two mechanical changes; the integration test needs only that `git` exists.

`mirror` takes a root and writes below it, so the content path arrives as an argument rather
than a constant. Add the assertion the origin could not write:

```ts
it("writes below whatever root it was given", async () => {
  await writeIssueNumbers({ root: join(repo, "elsewhere"), created: [{ file, number: 12 }] });

  expect(await readFile(join(repo, "elsewhere", file), "utf8")).toContain("issue: 12");
});
```

- [x] **Run it to verify it fails**

```bash
bun test src/bridge
```

- [x] **Write the implementation**

Copy both from the origin, imports only.

`iteration-branch.ts` imports `repositoryRoot` — the origin has its own; it takes this
repository's, which is the same function the hooks and every command already use.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

The integration test is the one to watch: it builds a repository, makes a branch, commits onto
it from elsewhere, and asserts the commit landed where it was aimed.

- [x] **Commit**
