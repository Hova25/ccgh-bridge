# cc-gh-bridge

A Claude Code plugin that gives a repository a development lifecycle: specifications and
tasks written as content, promoted through human gates, mirrored to GitHub issues, and
rendered as a documentation site.

It ships as one plugin carrying four things:

- **Eight skills** — `/open-iteration`, `/write-brainstorm`, `/write-spec`,
  `/decompose-into-tasks`, `/validate-iteration`, `/launch-iteration`, `/ship-iteration`,
  `/open-fix`.
- **Nine hooks** that refuse what the workflow forbids: committing on `main`, writing a
  generated field by hand, landing code that belongs to no iteration.
- **The `ccgh` command**, on the Bash tool's PATH, holding the content model, the scaffold,
  the promotion script and the GitHub bridge.
- **A documentation site**, started with `ccgh docs`, that renders the repository's content
  tree.

A consuming repository keeps only two things of its own: its content under `docs/`, and the
GitHub Actions workflows that `ccgh init` writes for it.

## Requirements

[Bun](https://bun.sh). The `ccgh` executable is a TypeScript file with a shebang, run
directly by Bun — there is no build step and no compiled binary to download.

## Status

Being extracted from the repository it grew in. Nothing is installable yet.

This repository develops itself with its own workflow: its specifications, decisions and
tasks live under `docs/`, and every change to it goes through the lifecycle it ships.
