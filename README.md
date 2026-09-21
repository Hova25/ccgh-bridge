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

A consuming repository keeps only three things of its own: its content under
`docs/ccgh-bridge/`, the five GitHub Actions workflows `ccgh init` writes for it — each
around twenty lines, because everything heavy belongs to the action this repository ships —
and the block of lifecycle rules `ccgh init` writes into its `CLAUDE.md`. The
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

It writes the workflows and records which reference they use. It also writes the lifecycle
rules into `CLAUDE.md`, between a `<!-- ccgh:begin -->` and a `<!-- ccgh:end -->` line: the
file is created if there is none, the block is appended to one that exists, and a re-run
replaces only the block, so the repository's own instructions around it are never touched.
Without it the hooks refuse mistakes, but nothing tells the session how the work moves.

On a repository that has no content directory yet, `init` adopts it rather than writing into
the clone. It refuses unless the clone is on `main` with nothing in progress, then creates the
branch `ccgh/<yyyy-mm-dd-HHMM>-adopt-ccgh` and its worktree in `../worktrees/`, writes there the
workflows, `ccgh.json`, the `CLAUDE.md` block and a first iteration, `adopt-ccgh`, whose one
task is choosing the repository's checks, commits it, and names the next command,
`/ccgh:validate-iteration`. It pushes nothing. On a repository that has adopted ccgh, a re-run
only rewrites what it owns.

The workflows reach the engine through `uses:`, so the repository clones nothing and installs
nothing; this repository must be public for that, or the workflow needs a token of its own.

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
is the word list the prose hook refuses in comments, prose and commit messages. Nothing is
refused unless it is listed; `ccgh init` writes the empty list when the key is missing, so that
the file shows the setting the repository runs with.

`title` names the site, which is otherwise the repository's directory. `repository` is where
its issues live, so that an issue number becomes a link; without it the number is printed
plain. `site` is where the built site is published, and `ccgh docs --build` refuses without
it — a site built with the wrong base works locally and breaks the moment it is published.
`action` is what the generated workflows put behind `uses:`; `ccgh init --from` sets it.

## Requirements

[Bun](https://bun.sh). The `ccgh` executable is a TypeScript file with a shebang, run
directly by Bun — there is no build step and no compiled binary to download.

## Releasing it

`plugin.json` carries the version and leads; the tags follow it. Bump it in a pull request and
merge it: the `release` workflow then tags the merge commit `v1.2.3`, moves `v1` onto it, and
publishes the GitHub release with notes listing the pull requests since the previous version.
A merge that leaves the version alone releases nothing.

`v1` is the moving major tag a consumer pins to, `v1.2.3` the one that never moves. A test
refuses a release tag on a commit whose manifest disagrees with it.

Should the workflow fail, the same release by hand, from the merge commit, is:

```
git tag -a v1.2.3 -m "Release 1.2.3" && git tag -f v1
git push origin v1.2.3 && git push -f origin v1
gh release create v1.2.3 --verify-tag --generate-notes
```

## Status

The engine, the plugin shell, the site and the bridge are done, released as `v1`, and proved
from a repository that had never seen this code: it installed the plugin from the marketplace,
ran `ccgh init`, and carried an iteration to `shipped` with its issues created and closed by
the bridge. That trial is written up in
[ccgh-sandbox](https://github.com/Hova25/ccgh-sandbox), including what it broke.

This repository's own content tree is published at
[hova25.github.io/ccgh-bridge](https://hova25.github.io/ccgh-bridge/), and it reaches its own
action by path rather than by tag, so a change to the action is tested by the pull request
that makes it.

This repository develops itself with its own workflow: its specifications, decisions and
tasks live under `docs/ccgh-bridge/`, and every change to it goes through the lifecycle it
ships.
