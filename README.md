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
`docs/ccgh-bridge/`, and the five GitHub Actions workflows `ccgh init` writes for it — each
around twenty lines, because everything heavy belongs to the action this repository ships. The
directory is a convention, not a rule — `ccgh.json` at the repository root can name another
one — and it sits inside `docs/` rather than owning it, so a repository's own documentation
is left alone.

## Installing it

```
/plugin marketplace add Hova25/ccgh-bridge
/plugin install ccgh@ccgh-bridge
```

Then, once, in the repository that will use it:

```
ccgh init
```

It writes the workflows and records which reference they use. They reach the engine through
`uses:`, so the repository clones nothing and installs nothing; this repository must be public
for that, or the workflow needs a token of its own.

Install Bun first: the plugin's installer runs `bun install`, and every command and hook it
carries is run by Bun.

## Configuring it

`ccgh.json`, at the repository root, and every key is optional:

```json
{
  "content": "docs/ccgh-bridge",
  "check": ["bun run lint"],
  "language": { "refuse": [] },
  "title": "The harness",
  "repository": "owner/name",
  "site": "https://owner.github.io/name",
  "action": "Hova25/ccgh-bridge@v1"
}
```

`content` names the content directory. `check` names the commands the commit hook runs on
staged files; with none, it runs nothing rather than somebody else's checks. `language.refuse`
is the word list the prose hook refuses — it ships with a list of French words, which is what
the repository this grew in needed, so a repository that writes French silences it here.

`title` names the site, which is otherwise the repository's directory. `repository` is where
its issues live, so that an issue number becomes a link; without it the number is printed
plain. `site` is where the built site is published, and `ccgh docs --build` refuses without
it — a site built with the wrong base works locally and breaks the moment it is published.
`action` is what the generated workflows put behind `uses:`; `ccgh init --from` sets it.

## Requirements

[Bun](https://bun.sh). The `ccgh` executable is a TypeScript file with a shebang, run
directly by Bun — there is no build step and no compiled binary to download.

## Releasing it

`plugin.json` carries the version and leads; the tags follow it. Bump it, merge, then:

```
git tag -a v1.2.3 -m "<what changed>" && git tag -f v1
git push origin v1.2.3 && git push -f origin v1
```

`v1` is the moving major tag a consumer pins to, `v1.2.3` the one that never moves. A test
refuses a release tag on a commit whose manifest disagrees with it.

## Status

The engine, the plugin shell, the site and the bridge are done. This repository enables the
plugin on itself and runs the workflows `ccgh init` writes for it, reaching its own action by
path so that a change to the action is tested by the pull request that makes it.

Nothing is published yet: there is no `v1` tag, so `ccgh init` without `--from` points at a
reference that does not exist. Tagging is a deliberate act and nobody has taken it.

This repository develops itself with its own workflow: its specifications, decisions and
tasks live under `docs/ccgh-bridge/`, and every change to it goes through the lifecycle it
ships.
