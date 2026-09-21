---
title: Fix records
order: 6
issue: 39
github:
  state: closed
  pr: null
  merged_at: null
  synced_at: '2026-09-21T00:10:39.085Z'
---

# Fix records

A fix has no specification, no tasks and no promotion — its whole lifecycle is one record and
one pull request. The bridge gives it an issue when the pull request opens, writes the number
back onto the branch, and edits the pull request body so that merging closes it.

Without this, a fix is the one kind of change the mirror cannot see, and this repository has
already made one.

**Files**

- Create: `src/bridge/fixes.ts`
- Test: `src/bridge/fixes.test.ts`

**Interfaces**

- Consumes: `GitHubClient` from task 2, `writeIssueNumbers` and `writePullRequest` from task 4.
- Produces: `planFixIssues({ entries, remote, arriving, pullRequest })`, `abandonedFixIssues({ entries, remote })`, `issuesArriving({ entries, arriving })`, `bodyClosing({ body, issues })`. Tasks 7 and 8 use them.

- [x] **Write the failing test**

Copy `fixes.test.ts` with the two mechanical changes. It covers a fix arriving with its pull
request, a fix already carrying an issue, and a body that already has its `Closes` line.

`bodyClosing` returns `null` when nothing needs adding, which is what stops the bridge editing
a pull request body on every run. Keep that assertion in view: an edit with no change is a
notification with no news, and people stop reading them.

- [x] **Run it to verify it fails**

```bash
bun test src/bridge/fixes.test.ts
```

- [x] **Write the implementation**

Copy `fixes.ts`, imports only.

The one thing to check while moving it: `planFixIssues` takes `arriving` as a set of paths
already relative to the content root. The CLI is what strips the prefix, so the prefix belongs
to task 8 and not here — the module must not learn where content lives.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

- [x] **Commit**
