---
title: Relink and reconcile
order: 7
issue: 40
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Relink and reconcile

The two that exist because mirrors fail quietly.

`reconcile` runs both directions and then reports what neither fixed: a task whose `synced_at`
has gone stale, an issue opened for a fix record that never reached `main`. It exits non-zero
when it finds any, because a scheduled job that always succeeds is a job nobody reads.

`relink` rewrites the paths inside issue bodies after a mass rename. It is the tool of a
migration that already happened, and it crosses anyway: a mass rename will happen again — this
repository has already moved its whole content tree once — and rebuilding it under pressure is
worse than carrying it.

**Files**

- Create: `src/bridge/relink.ts`
- Test: `src/bridge/relink.test.ts`

**Interfaces**

- Consumes: `listBodies` and `updateBody` from task 2, `staleTasks` from task 5, `abandonedFixIssues` from task 6.
- Produces: `readTable(markdown)`, `planRelink({ bodies, table })`, `namesRewritten({ before, table })`. Task 8 wires both verbs; nothing else depends on them.

`reconcile` has no module of its own: it is a composition of `push` and `sync` plus two
reports, and it lives in the command. Giving it a module would be a file that only forwards.

- [x] **Write the failing test**

Copy `relink.test.ts` with the two mechanical changes.

- [x] **Run it to verify it fails**

```bash
bun test src/bridge/relink.test.ts
```

- [x] **Write the implementation**

Copy `relink.ts`, imports only.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

- [x] **Commit**
