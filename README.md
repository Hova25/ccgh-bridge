# ccgh-bridge

A Claude Code plugin that gives a repository a development lifecycle: specifications and
tasks written as content, promoted through human gates, mirrored to GitHub issues, and
rendered as a documentation site.

It ships as one plugin carrying four things:

- **Eight skills** — `/ccgh:open-iteration`, `/ccgh:write-brainstorm`, `/ccgh:write-spec`,
  `/ccgh:decompose-into-tasks`, `/ccgh:validate-iteration`, `/ccgh:launch-iteration`,
  `/ccgh:ship-iteration`, `/ccgh:open-fix`.
- **Eight hook rules** that refuse what the workflow forbids: committing on `main`, writing a
  generated field by hand, landing code that belongs to no iteration.
- **The `ccgh` command**, on the Bash tool's PATH, holding the content model, the scaffold,
  the promotion script and the GitHub bridge.
- **A documentation site**, started with `ccgh docs`, that renders the repository's content
  tree.

A consuming repository keeps only two things of its own: its content under
`docs/ccgh-bridge/`, and the GitHub Actions workflows that `ccgh init` writes for it. The
directory is a convention, not a rule — `ccgh.json` at the repository root can name another
one — and it sits inside `docs/` rather than owning it, so a repository's own documentation
is left alone.

## Installing it

```
/plugin marketplace add Hova25/ccgh-bridge
/plugin install ccgh@ccgh-bridge
```

Install Bun first: the plugin's installer runs `bun install`, and every command and hook it
carries is run by Bun.

## Configuring it

`ccgh.json`, at the repository root, and every key is optional:

```json
{
  "content": "docs/ccgh-bridge",
  "check": ["bun run lint"],
  "language": { "refuse": [] }
}
```

`content` names the content directory. `check` names the commands the commit hook runs on
staged files; with none, it runs nothing rather than somebody else's checks. `language.refuse`
is the word list the prose hook refuses — it ships with a list of French words, which is what
the repository this grew in needed, so a repository that writes French silences it here.

## Requirements

[Bun](https://bun.sh). The `ccgh` executable is a TypeScript file with a shebang, run
directly by Bun — there is no build step and no compiled binary to download.

## Status

The engine and the plugin shell are done: the skills, the hooks and the `ccgh` command all
work, and this repository enables the plugin on itself. The documentation site and the GitHub
bridge are not built yet — `ccgh docs` and `ccgh init` do not exist.

This repository develops itself with its own workflow: its specifications, decisions and
tasks live under `docs/ccgh-bridge/`, and every change to it goes through the lifecycle it
ships.
