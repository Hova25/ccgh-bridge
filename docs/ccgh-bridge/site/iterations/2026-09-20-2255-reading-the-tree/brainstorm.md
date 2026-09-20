---
title: Reading the tree
date: 2026-09-20
participants:
  - hovannes
  - claude
---

# Reading the tree

## What prompted this

Two of the eight skills describe a documentation server and then say it does not exist. That
sentence was written one iteration ago as an honest placeholder, and it is the last thing in
the plugin that promises something absent.

The absence is not cosmetic. `/ccgh:open-iteration` tells the writer to read the brainstorm,
the specification and the tasks on the site rather than from file paths, because a
specification read as a file path is a specification nobody reads — the board is invisible,
the dependencies are invisible, and a task's place in its iteration is a directory listing.
Without the site, the workflow's reading half is missing while its writing half is complete.

The site itself is not in question. It exists, it works, and it is roughly two thousand nine
hundred lines: seven components, eight pages, six pure modules with their tests, and two
stylesheets whose contrast is asserted rather than assumed. What is in question is how it
reaches a repository that does not contain it.

## What was considered

**How the site reaches a project.** Settled during the bootstrap and restated here because it
is the premise everything else rests on: the site ships inside the plugin and reads
`${CLAUDE_PROJECT_DIR}`. A consuming repository holds no Astro file. The two rejected shapes
were an npm package with a small Astro application in each project — every project then
carries an application and its dependencies — and a template copied by an init command, which
has nothing to package and no upgrade path.

**What it costs to carry.** Astro and its dependencies are one hundred and forty-two
megabytes installed, measured rather than estimated, on top of the hundred and one the plugin
already installs. Three ways to carry that were weighed.

Installing it lazily, at the first `ccgh docs`, keeps the plugin light. It was rejected once
the storage was traced: the install would land in the plugin's own directory, which Claude
Code replaces on every plugin update, so the install would be silently undone and the next
`ccgh docs` would fail — and an offline machine could never start the site at all. Asking the
question during `ccgh init` was raised and fails the same way: it moves when the question is
asked, not where the answer is stored.

Shipping the site as a second plugin in the same marketplace was rejected for a different
reason: the site needs the engine, so either it duplicates it or the two plugins become
coupled with nothing to enforce it.

**The site is a dependency of the plugin.** Every consumer installs it, including the ones
who never open it. The cost is real, irreversible once published, and accepted.

**Where Astro writes.** This is the part the design had not seen, and it changed the shape of
the work. Astro does not only read: it writes `.astro/`, its content-collection cache, and
`dist/`. Written where the site lives, both land in the plugin's directory — the one Claude
Code replaces, and the one **shared between every project on the machine**. A collection cache
built from one repository would be served to another, which is a defect nobody would suspect
because it looks like stale content rather than the wrong repository.

So `cacheDir` and `outDir` point into the repository being read, under `.ccgh/`, never into
the plugin. That single decision is what makes one plugin usable by two repositories in one
afternoon.

**The base URL of a built site.** A site published on GitHub Pages lives under `/<repository>/`
and every link needs that prefix. Deriving it from `git remote get-url origin` was proposed
and rejected in favour of an explicit `site` key in `ccgh.json`: the derivation is invisible
when it guesses wrong, and a repository published anywhere else would be guessed at rather
than read. The failure the explicit key introduces — forgetting it — is answered by refusing
to build without it, since a site with dead links works locally and breaks only once it is
published.

**What the static build is for, and what it is not.** The build writes the files. Publishing
them is a GitHub Actions workflow, which a plugin cannot carry and `ccgh init` will write, so
it belongs to the iteration that builds the bridge. Building in CI to prove the site still
compiles was considered and deferred for the same reason: this repository still has no CI, by
a decision taken one iteration ago, and adding it here would mix two subjects.

**The design.** It crosses unchanged — the tokens, the base stylesheet, the contrast tests,
the seven components, the light and dark themes, the search palette. Nothing is redrawn. A
site rewritten while being moved is a site nobody reviewed, and the same rule applied to the
engine and to the hooks before it.

## Not settled here

Who publishes the built site, and to where. The build writes into `.ccgh/site/`; wiring that
to a host is a workflow, and workflows arrive with `ccgh init`.

Whether the origin repository migrates to this site. Unchanged from the bootstrap: extract,
prove it here, migrate later as its own decision.

`harnessSkills` does not cross. The origin declares a collection over `.claude/skills` and
renders it on no page; it is dead, and it is recorded here so that its absence reads as a
removal rather than an oversight.
