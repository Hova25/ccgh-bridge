---
title: Plugin shell
status: active
depends_on: []
impacts: []
validated_by: hovannes
validated_at: '2026-09-20T22:09:23.369Z'
launched_by: hovannes
launched_at: '2026-09-21T00:01:31.417Z'
launched_tasks:
  - tasks/01-manifest-and-first-skill.md
  - tasks/02-the-remaining-skills.md
  - tasks/03-hook-rules.md
  - tasks/04-hook-wiring.md
  - tasks/05-configuration-for-language-and-checks.md
  - tasks/06-adoption.md
---

# Plugin shell

## Problem

The engine is a command at a path. `ccgh validate` works if you know where `bin/ccgh` is,
and nothing else about the workflow exists here: the eight skills that know when to scaffold
an iteration and what to write into it are still in the repository this was extracted from,
and so are the eight hook rules that refuse a commit on `main`, a change belonging to no
iteration, or a hand-written generated field.

Without them the repository ships a validator, not a lifecycle. Worse, the three iterations
that follow — the site, the bridge, the marketplace — would each be specified against a
plugin nobody had ever loaded.

## Goals

A plugin this repository loads on itself, so that in it: the eight skills answer under their
namespace, a commit on `main` is refused by a hook rather than by good intentions, and
`ccgh` is on the Bash tool's `PATH` without anyone naming a path.

Every rule that referred to one repository's layout — the content directory, the check
command, the harness's own location — reading it from configuration instead.

The hook rules keeping the tests they came with, running on Bun.

## Non-goals

**The remote marketplace.** A `marketplace.json` lands here so that this repository can
enable its own plugin, and it names a local source. Installing this plugin from another
repository belongs to the iteration that publishes it.

**The documentation site.** Two skills invoke a documentation server. They will name
`ccgh docs` and say it does not exist yet rather than pretend.

**`ccgh init` and the workflows.** Unchanged: a later iteration.

**The conventions checker.** Still not ported, still recorded as a risk on the iteration that
left it behind. `check-staged-files` runs whatever a repository configures, and this
repository configures Biome alone.

## Contract

### Layout

```
.claude-plugin/plugin.json       name: ccgh
.claude-plugin/marketplace.json  one entry, source: the repository itself
skills/<eight>/SKILL.md
hooks/hooks.json
hooks/lib/run.ts                 stdin to a decision, exit 0 or 2
hooks/rules/<eight>.ts
hooks/rules/<eight>.test.ts
.claude/settings.json            this repository subscribing to its own plugin
```

`bin/`, `src/` and `docs/` stay where they are. The plugin root is the repository root, so
the executable is already in the right place and `hooks/rules/*.ts` import `contentRoot`
from `../../src/project` rather than reimplementing it.

### The namespace

`plugin.json` declares `"name": "ccgh"`. Skills answer as `/ccgh:open-iteration`,
`/ccgh:write-spec`, and so on. The repository, the marketplace entry and the package keep
`ccgh-bridge`.

### The eight skills

`open-iteration`, `write-brainstorm`, `write-spec`, `decompose-into-tasks`,
`validate-iteration`, `launch-iteration`, `ship-iteration`, `open-fix`.

They arrive unchanged except at their call sites:

| Was | Becomes |
| --- | --- |
| `pnpm --filter <app> validate` | `ccgh validate` |
| `pnpm --filter <app> scaffold …` | `ccgh scaffold …` |
| `pnpm --filter <app> iteration:promote …` | `ccgh promote …` |
| `pnpm --filter <app> dev` | named as `ccgh docs`, stated as not yet existing |

No skill keeps a path from the repository they came from.

### The eight hook rules

| Rule | Event | What changes in the move |
| --- | --- | --- |
| `protect-main-branch` | Bash | nothing |
| `require-a-home` | Bash | calls `homeOf` from `src/commands/require-a-home` instead of its own copy |
| `enforce-iteration-isolation` | Bash | the hardcoded `src/content/` becomes the resolved content root |
| `check-staged-files` | Bash | the check command comes from `ccgh.json`; no check configured means the rule is inert |
| `refuse-bash-writes-to-content` | Bash | the content path becomes the resolved content root |
| `require-decision-notice` | Bash, Write/Edit | `.claude/` becomes the plugin's own directories |
| `enforce-language` | Bash, Write/Edit | the word list may be replaced or emptied by `ccgh.json` |
| `protect-generated-frontmatter` | Write/Edit | nothing |

Each rule stays a pure `decide({ input, context })` returning a refusal string or `null`,
which is what lets every one of them be tested without a tool call. `hooks/lib/run.ts` keeps
both shapes: `run` refusing with exit 2, `runAsk` returning a `permissionDecision: "ask"`.

Hooks resolve the project from `CLAUDE_PROJECT_DIR`, falling back to the working directory.

### `ccgh.json`

One file, at the repository root, every key optional:

```json
{
  "content": "docs/ccgh-bridge",
  "check": ["bun run lint"],
  "language": { "refuse": ["alors", "aussi", "…"] }
}
```

`content` is unchanged from the engine. `check` is the commands `check-staged-files` runs
over staged files; absent, the rule passes. `language` replaces the built-in French list;
`{ "refuse": [] }` silences the rule, and absent leaves the built-in list in force.

### Adoption

`.claude/settings.json` in this repository declares the marketplace as a local source and
enables `ccgh`. What it cannot do is grant permissions: a plugin's own `settings.json`
supports only `agent` and `subagentStatusLine`, so nothing this plugin ships can put
`ccgh promote` on an allowlist. The human gate on promotion is therefore guaranteed by the
platform rather than by configuration.

## Failure modes

**Bun is missing on the consumer's machine.** Every hook and `bin/ccgh` fail at the shebang.
The plugin installer already requires a `bun.lock` to install dependencies, so this is the
same prerequisite stated twice, and the README states it once more.

**A hook rule throws.** `run` exits 2 with `hook failed: <message>`, which blocks the tool
call. A rule that cannot decide must not be read as a rule that allowed it.

**`ccgh.json` is malformed.** The engine already refuses it with the parse error. A hook
that cannot read configuration refuses rather than proceeding with defaults, for the same
reason.

**A repository writes French deliberately.** `enforce-language` refuses every such write
until `ccgh.json` says `{ "language": { "refuse": [] } }`. This is the cost of the default
chosen, and it is a loud failure rather than a silent one.

**The plugin is enabled but not installed.** Project settings alone do not install a plugin
from an external source. Claude Code reports it as not installed and names the command to
run. The local marketplace source is what avoids this here; a consumer of the published
plugin will install it explicitly.

## Risks

**"English by default" is in truth "no French by default".** The word list is French. A team
writing German or Spanish is neither hindered nor protected, and may reasonably believe the
rule does something it does not. Recorded rather than solved: a general language rule is a
different problem from the one this list was written for.

**The plugin carries the whole repository.** `src/`, `docs/` and every test travel to each
consumer. It is inert weight today and it is the price of having no build step; a consumer
reading `docs/ccgh-bridge/` and mistaking this repository's iterations for their own is the
more plausible confusion.

**Six rules move with their tests, two change shape.** `check-staged-files` and
`enforce-language` gain configuration, which is new behaviour written during a move — the
failure this kind of iteration causes. Their tests are extended before the change, not after.

**Adoption borrows from a later iteration.** The local marketplace entry is a piece of the
publishing iteration arriving early. If publishing later needs a different shape, this entry
is rewritten rather than extended.

## Open questions

None blocking.

One is deferred: whether a consumer should be able to disable individual hook rules. Today
it is all eight or none, plus the two that configuration can silence. Nobody has asked for
finer control, and inventing it now would be a guess.
