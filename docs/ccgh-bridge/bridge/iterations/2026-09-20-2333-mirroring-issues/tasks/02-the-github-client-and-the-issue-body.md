---
title: The GitHub client and the issue body
order: 2
issue: 35
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The GitHub client and the issue body

The two ends of the bridge that have no opinions: the client that talks to GitHub, and the
function that turns a task file into an issue title and body.

`render` is where the hardcoded content path lives — the issue body carries a
`blob/main/<path>` link back to the file it came from, and the origin wrote its own path into
it. This is the fourth time that constant has been hunted down, and the last.

**Files**

- Create: `src/bridge/github.ts`, `src/bridge/render.ts`
- Test: `src/bridge/github.test.ts`, `src/bridge/render.test.ts`

**Interfaces**

- Consumes: `ParsedEntry` from `src/model/validate`, and `contentRoot` from `src/project`.
- Produces: `createGitHubClient({ token, owner, repo }): GitHubClient` with `readState`, `createIssue`, `updateIssue`, `comment`, `addLabel`, `ensureLabel`, `pullRequestForBranch`, `listBodies` and `updateBody`; `renderIssue({ entry, url }): RenderedIssue`; and `fileFromMarker(body): string | null`. Tasks 3 to 7 use all of them.

- [x] **Write the failing test**

Both tests come with the code. Copy `github.test.ts` and `render.test.ts` from the origin's
bridge, changing the `vitest` import and the paths, which now point at `../model/`.

`renderIssue` takes its URL as an argument already — the origin passes a function built in the
CLI — so the test that would have caught the hardcoded path does not exist there. Write it:

```ts
it("links back to the file through whatever content root the repository has", () => {
  const rendered = renderIssue({
    entry,
    url: (file) => `https://github.com/o/r/blob/main/elsewhere/${file}`,
  });

  expect(rendered.body).toContain("/blob/main/elsewhere/engine/iterations/");
  expect(rendered.body).not.toContain("src/content");
});
```

- [x] **Run it to verify it fails**

```bash
bun test src/bridge
```

- [x] **Write the implementation**

Copy `github.ts` and `render.ts` from the origin, with the import paths as the only change.
Neither reads a file system and neither knows where content lives; the URL reaches `render` as
a function, and the function is built where the content root is known.

`github.ts` keeps `@octokit/rest`, which becomes a dependency of this repository.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then diff both against the origin and confirm the only differences are imports.

- [x] **Commit**
