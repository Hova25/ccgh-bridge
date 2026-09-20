---
title: Reading the tree
status: ready
depends_on: []
impacts:
  - plugin
validated_by: hovannes
validated_at: '2026-09-20T23:01:48.602Z'
---

# Reading the tree

## Problem

The workflow can be written and cannot be read. `ccgh scaffold` writes a specification,
`ccgh promote` moves it through its statuses, and the only way to read any of it is to open
files by path. The board that shows where every iteration stands, the tree that shows a task's
place inside its iteration, and the search that finds a decision by what it said all exist —
in the repository this was extracted from, and nowhere a second project can reach.

Two skills say so out loud today. `/ccgh:open-iteration` step 8 and `/ccgh:ship-iteration`
name `ccgh docs` and state that it does not exist yet. That sentence was an honest placeholder
and it is now the last promise in the plugin that nothing keeps.

The site is around two thousand nine hundred lines that already work: eight pages, seven
components, six pure modules with their tests, and two stylesheets whose contrast is asserted
rather than assumed. One line couples it to the repository it grew in:

```ts
loader: glob({ base: "./src/content", pattern, generateId: keepPath })
```

Everything else about the coupling is not in the source at all. It is in where Astro runs and
where Astro writes.

## Goals

`ccgh docs`, run in any repository, serving that repository's content tree from a site that
lives in the plugin and contains none of it.

`ccgh docs --build`, writing a static copy that the repository can publish, refusing to build
a site whose links would be dead.

The same plugin serving two different repositories on one machine without either seeing the
other's content.

Every pure module arriving with the tests it already has, and the design arriving unchanged.

## Non-goals

**Publishing.** The build writes files; a workflow publishes them, a plugin cannot carry a
workflow, and `ccgh init` writes them. That is the iteration that builds the bridge.

**Continuous integration.** This repository still has no CI, by a decision taken one iteration
ago. Building the site in CI to prove it compiles is worth doing there, not here.

**Any redesign.** The tokens, the stylesheets, the components and both themes cross unchanged.
A site rewritten while being moved is a site nobody reviewed.

**`harnessSkills`.** The origin declares a collection over `.claude/skills` and renders it
nowhere. It does not cross.

## Contract

### Where things live

| Path | What |
| --- | --- |
| `site/astro.config.ts` | the Astro project: root, `srcDir`, `cacheDir`, `outDir` |
| `site/src/content.config.ts` | the seven collections, their `base` resolved at load |
| `site/src/pages/` | the eight pages |
| `site/src/components/` | `Shell`, `Prose`, `Tree`, `ThemeToggle`, `Search`, `BoardGroup`, `TaskRow` |
| `site/src/styles/` | `tokens.css`, `base.css` |
| `site/src/entries.ts` | the only module that touches `astro:content` |
| `src/docs/` | `routes`, `tree`, `board`, `recent`, `search-index`, `leaf`, `contrast` — pure, tested by `bun test` |
| `src/commands/docs.ts` | `ccgh docs` |

The pure modules live under `src/` with the engine rather than inside the Astro project,
because `bun test` runs there and because none of them import anything from Astro. `entries`
is the boundary: it reads the collections and returns the same `ParsedEntry[]` the engine's
validator already defines, so everything downstream of it is testable without a browser.

### Where Astro runs, and where it writes

```
astro dev   --root <plugin>/site
astro build --root <plugin>/site
```

The project root is the plugin. The content is elsewhere, and so is everything Astro writes:

| Option | Value |
| --- | --- |
| `glob({ base })` | `contentRoot({ from: project })`, absolute |
| `cacheDir` | `<project>/.ccgh/cache` |
| `outDir` | `<project>/.ccgh/site` |
| `site`, `base` | from `ccgh.json`, on a build only |

`project` is `CLAUDE_PROJECT_DIR`, falling back to the working directory — the same resolution
`hooks/shell.ts` already uses.

Both redirections are load-bearing rather than tidy. Left at their defaults they write into
the plugin's own directory, which Claude Code replaces on every plugin update, and which is
shared by every project on the machine: a collection cache built from one repository would be
served to another, and it would read as stale content rather than as the wrong repository.

### The command

```
ccgh docs [--port <n>]      starts the dev server
ccgh docs --build           writes <project>/.ccgh/site
```

`--build` requires `site` in `ccgh.json` and refuses without it, naming the key and what to
write. A built site with the wrong base works locally and breaks on publication, silently,
which is the failure this refusal exists to prevent.

```json
{ "site": "https://hova25.github.io/ccgh-bridge" }
```

`base` is derived from that URL's path, so one key answers both questions.

### The title

The site is named after the repository directory, and `ccgh.json` may override it with
`title`. Nothing in the source names a project.

## Failure modes

**Astro is not installed.** It is a dependency of the plugin, so this means the plugin's
install did not finish. `ccgh docs` says that, and says to run the install again, rather than
printing a module resolution error.

**No content directory.** The same refusal `ccgh validate` already gives, naming the path it
looked for.

**`--build` without `site`.** Refused before Astro starts, naming the key.

**Port already held.** Astro's own message, which names the port and picks another; the
command does not hide it.

**`.ccgh/` not ignored.** The build writes into the repository being read. `ccgh docs` says
so the first time it creates the directory, and says to add it to `.gitignore`, because a
repository that commits its built site will do it once and hate it.

## Risks

**One hundred and forty-two megabytes for everyone.** Astro and its dependencies are installed
by every consumer of the plugin, including the ones who never open the site. Measured, not
estimated. Irreversible once the plugin is published, and accepted in the brainstorm for
reasons stated there.

**Astro runs from a directory it does not own.** Root in a plugin cache, content in one
repository, cache and output in another place again. Every one of those is a supported option
and the combination is not a common one. This is why the first task proves the arrangement
end to end before a single page is written: if Astro refuses it, the iteration changes shape
at task 1 rather than at task 5.

**`leaf.ts` arrives without a test.** The origin has none. It is twenty-nine lines and the
pages depend on it; the task that moves it writes the test the origin never had rather than
carrying the gap across.

**The site becomes the fourth thing that knows the content shape**, after the schemas, the
paths and the validator. It is not a new risk — the origin lived with it — but it is why
`entries` returns the engine's own `ParsedEntry` rather than a shape of its own.

## Open questions

None blocking. Two things are deliberately left to the iteration that follows: who publishes
the built site, and whether the site is built in CI to prove it still compiles.
