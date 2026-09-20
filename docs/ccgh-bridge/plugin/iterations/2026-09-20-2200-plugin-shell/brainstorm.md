---
title: Plugin shell
date: 2026-09-20
participants:
  - hovannes
  - claude
---

# Plugin shell

## What prompted this

The engine works and nobody can reach it. `ccgh` is an executable at a path, the eight
skills that know how to use it are still in the repository it was extracted from, and the
hooks that refuse a commit on `main` are still wired to that repository's `.claude/`. What
exists is a library with a command-line front door; what was promised is something another
project installs.

The vehicle was decided before the extraction started: a Claude Code plugin. This iteration
is where that decision meets the reference rather than the memory of it, and three things
it says changed the shape of the work.

## What was considered

**Where the plugin lives.** Two shapes were weighed: the repository *is* the plugin, or the
plugin sits in a `plugin/` subdirectory holding only what a consumer needs. The subdirectory
is tidier for the consumer and wrong for everything else: `bin/ccgh` imports `../src/`, and
a subdirectory cannot reach above itself in what the installer clones. Making it work means
duplicating the engine or introducing a build step, and this repository was built on the
premise that there is no build step. **The repository is the plugin.** The cost is accepted
and small: `src/`, `docs/` and the tests travel to every consumer as a few hundred inert
kilobytes.

**The namespace.** A plugin's skills are always prefixed with the plugin's own name, so
`/open-iteration` becomes `/<name>:open-iteration` and the name is typed every day. Naming
the plugin `ccgh-bridge` after the repository would make `/ccgh-bridge:decompose-into-tasks`
the daily reality. **The plugin is named `ccgh`**, matching the command; the repository and
the marketplace keep the longer name, where length costs nothing.

**Which hook rules travel.** Of the eight, six are the workflow itself and were never in
doubt. `require-decision-notice` is general discipline rather than this lifecycle, and
travels because what it protects — that tests are not quietly deleted and dependencies not
quietly added — is what the lifecycle assumes. `enforce-language` is a French-word blocklist:
a house rule of a French-speaking team obliging itself to write English. Three options were
weighed — leave it behind, carry it inert, carry it active and configurable — and the last
was chosen. It travels **active, with its built-in list**, and `ccgh.json` can replace or
silence it. The honest consequence is recorded in the specification: "English by default" is
in truth "no French by default", and a repository that writes French deliberately is refused
until it configures.

**How this repository adopts its own plugin.** `--plugin-dir .` is the documented development
path and is per-session: someone has to remember to type it, which is not adoption. Project
settings alone do not install a plugin from an external source. What works is a marketplace
entry the repository declares about itself, referenced from its own `.claude/settings.json`.
That is a piece of the marketplace iteration arriving early, and it is taken deliberately
rather than discovered later: without it, three more iterations would be written against a
plugin nobody had run.

## Not settled here

**The remote marketplace.** Installing this plugin *from another repository* stays with the
iteration that publishes it. What lands here is the local entry and nothing more.

**Publishing `ccgh` to npm.** Still the obvious answer for the GitHub Actions of a consuming
repository, and still the business of the iteration that writes those workflows.

**What the skills say about the site.** Two of them invoke a documentation server that does
not exist yet. They will name the command without pretending it works, and the iteration
that builds the site makes them true.

**Whether the origin repository migrates.** Unchanged since the bootstrap: it keeps its copy
until its own migration is specified, and the drift is accepted.
