---
title: Bootstrap
status: shipped
depends_on: []
impacts: []
validated_by: hovannes
validated_at: '2026-09-21T00:01:31.278Z'
launched_by: hovannes
launched_at: '2026-09-21T00:01:31.328Z'
launched_tasks:
  - tasks/01-repository-and-project-resolution.md
  - tasks/02-content-model.md
  - tasks/03-the-validate-command.md
  - tasks/04-the-scaffold-command.md
  - tasks/05-the-promote-command.md
  - tasks/06-the-require-a-home-command.md
---

# Bootstrap

## Problem

The workflow exists and works, in one repository, welded to it. The engine — the content
model, its six rules, the scaffold, the promotion script and the `require-a-home` check —
is around nineteen hundred lines that already do the right thing, and cannot be pointed at a
second project.

The weld is narrow and precise. `loadContent(root)` already takes its root as an argument;
the four entry points that call it do not. Each one computes the content directory from its
own file location:

```ts
const root = fileURLToPath(new URL("../src/content", import.meta.url));
```

That single line, repeated four times, is what forces a project's content to live inside the
documentation application, and what makes every call site reach the engine through a pnpm
filter naming that application.

Nothing else about the engine is project-specific. It is a library with four hardcoded
front doors.

## Goals

A repository that holds the engine, runs on Bun, and has no build step.

One executable, `ccgh`, with four subcommands — `validate`, `scaffold`, `promote`,
`require-a-home` — each doing exactly what its predecessor did.

A content root resolved from the repository being worked on rather than from the engine's
own location, so the same command works in a repository the engine has never seen, and so a
repository whose content is not in `docs/` can say where it is.

Every test that came with the engine still passing, on Bun's runner.

## Non-goals

**The plugin, the site, the bridge and `init`.** Four later iterations. This one produces a
command, not a plugin: nothing is installable at the end of it.

**Publishing anything.** Not to npm, not to a marketplace.

**The conventions checker.** `arrow-constants` and `single-object-parameter` are enforced in
the repository this code comes from, and the code obeys them. They are a code-style tool with
their own life, not part of the harness, and porting them is not part of extracting it. The
consequence is accepted and recorded under risks.

**Touching the origin repository.** It keeps its copy, unchanged, until its own migration is
specified.

## Contract

### Layout

```
bin/ccgh                       the executable, #!/usr/bin/env bun, no extension
src/project.ts                 repository root and content root resolution
src/model/schemas.ts           the seven schemas and the shared patterns
src/model/paths.ts             a file path to a ContentLocation
src/model/load.ts              a content root to LoadedContent
src/model/validate.ts          LoadedContent to Failure[]
src/model/rules/*.ts           cycles, naming, references, status, structure
src/commands/validate.ts
src/commands/scaffold.ts
src/commands/promote.ts
src/commands/require-a-home.ts
```

Tests sit beside the file they test, as they already do.

### Resolving the content root

Two functions, and the whole of what this iteration adds:

```ts
export const repositoryRoot = ({ from }: { from: string }): string;
export const contentRoot = ({ from }: { from: string }): string;
```

`repositoryRoot` walks up from `from` to the nearest ancestor containing `.git`, and throws
with that path in the message when there is none. `.git` is a directory in a clone and a
**file** in a git worktree; both count, because this workflow puts every branch in a
worktree.

`contentRoot` resolves, in order:

1. `content` in `ccgh.json` at the repository root, if the file exists and carries it,
   resolved relative to the repository root;
2. otherwise `docs/`.

No command-line flag. Two ways to say the same thing is one too many, and a test that needs
a different root passes a different `from`.

`ccgh.json` is optional and, for a repository following the convention, absent. Its one use
today is a repository whose content already lives elsewhere and should not be moved:

```json
{ "content": "apps/site/src/content" }
```

### The command

```bash
ccgh validate                                  # every problem at once, exit 1 if any
ccgh scaffold iteration <domain>/<slug>
ccgh scaffold fix <domain>/<slug>
ccgh scaffold task <domain>/<iteration> <slug>
ccgh promote <domain>/<iteration> --to <status> [--dry-run]
ccgh require-a-home <base> <changed...>
```

Each subcommand keeps the output its predecessor printed, to the line: `validate` reports
every problem rather than stopping at the first, `scaffold` prints the files it wrote and
then the reference, `promote` prints the transition and the task list and refuses to write
without `--dry-run` having been possible. An unknown subcommand, or none, prints the usage
above to stderr and exits 1.

The executable is a TypeScript file with `#!/usr/bin/env bun` and no extension, committed
with the executable bit. Bun runs it directly; there is no build step and no `tsx`.

### Toolchain

Bun, for the runtime, the package manager and the test runner. `bun.lock` is committed —
Claude Code's plugin installer reads it and would skip a pnpm lockfile.

The Vitest imports become Bun's. The tests were written against `describe`, `it` and
`expect`, which Bun provides, so the change is the import line and the runner. Vitest leaves
with them.

Biome stays, at the settings the moved code was written for: two-space indentation, a
hundred columns, double quotes, semicolons, and `useConsistentTypeDefinitions` refusing an
`interface`. Keeping it means nineteen hundred lines arrive without being reformatted, and a
reformatting diff is the one thing that would hide a real change during a move.

## Failure modes

**The command runs outside a repository.** `repositoryRoot` finds no `.git` and throws,
naming the directory it started from. Without that, `contentRoot` would silently return
`docs/` relative to somewhere arbitrary and `validate` would report an empty tree as valid.

**The content root does not exist.** `docs/` is missing because the repository has not been
initialised. `validate` says so with the resolved path, rather than reporting a valid empty
tree — an empty tree and a missing tree are not the same answer.

**`ccgh.json` is malformed.** It fails with the parse error and the file path, rather than
falling back to `docs/`. A silent fallback would validate the wrong directory and report
success.

**Bun is not installed.** The shebang fails with the kernel's own message, which names the
interpreter. This is the prerequisite the README states, and it is why the onboarding page
will state it too.

## Risks

**Nothing enforces `arrow-constants` and `single-object-parameter` here.** The code arrives
obeying both, and there is no reason it will keep doing so. The alternative was to port a
second package in an iteration about moving the first. The likely outcome is that the
conventions checker follows later, in its own iteration, and that the code drifts a little
in the meantime.

**Bun's test runner is not Vitest.** It provides the same three functions and is not the
same implementation. The tests being moved use `expect(value, message)` with a message
argument and a few matchers that may not map one to one. The migration is expected to be
mechanical, and "expected" is the operative word; if it is not, the fallback is keeping
Vitest as a devDependency, which costs a dependency and nothing else.

**No build step means no type checking at run time.** Bun strips the types and runs. A type
error reaches the user as a runtime failure unless `tsc --noEmit` is part of the checks, so
it is — but it is a separate command that someone has to run, where a compiled binary would
not have been optional.

**The origin drifts from the moment this lands.** Accepted deliberately, recorded so that it
is not rediscovered as a surprise.

## Open questions

None blocking.

One is deferred to the iteration that builds the workflows: the GitHub Actions of a consuming
repository need `ccgh` without the plugin being installed, which probably means publishing it
to npm alongside the plugin. It changes nothing here.
