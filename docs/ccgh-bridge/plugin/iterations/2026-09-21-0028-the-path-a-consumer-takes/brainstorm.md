---
title: The path a consumer takes
date: 2026-09-21
participants:
  - hovannes
  - claude
---

# The path a consumer takes

## What prompted this

Four iterations have shipped and nobody has ever installed this. The bootstrap said why that
matters, and said it before any of it existed:

> The sandbox repository stays necessary alongside it, because self-hosting exercises the
> plugin loaded from a directory, never the path a real consumer takes — installing it from a
> marketplace.

Everything proved so far was proved by the repository that wrote it. `uses: ./` resolves
because the action is in the checkout. The plugin loads because `.claude/settings.json` points
at `.`. `ccgh` is on the PATH because the plugin directory is this directory. Not one of those
holds for someone else, and each was convenient exactly where a consumer has nothing.

There is also a promise outstanding. `ccgh init` defaults to `Hova25/ccgh-bridge@v1`, and `v1`
does not exist. A repository that runs `ccgh init` today gets five workflows that all fail at
`uses:`.

## What was considered

**What "publishing" means here.** Three things were on the table and they are not equally
useful.

Tagging `v1` is a keystroke, and it is what makes the default in `ccgh init` true rather than
aspirational. It is also the smallest of the three and the only one everything else depends on.

Publishing the site turns `ccgh docs --build` into something a team reads without cloning. It
needs a sixth workflow, which is the first thing `ccgh init` writes that not every repository
wants — a repository with no `site` key should get no pages workflow at all.

Proving it on a sandbox repository is the one that can fail, and therefore the one worth doing.
The other two are additions; this one is a test of everything already built.

**Doing only the tag.** Rejected: a tag proves nothing on its own, and a tag pointing at code
nobody has installed is a version number applied to a hypothesis.

**Doing the sandbox without the tag.** Possible — `--from Hova25/ccgh-bridge@main` works today
— and rejected for the same reason in reverse: following the trunk is what a contributor does,
not what a consumer does. A consumer pins, and pinning is what has never been tested.

**Both, with the site published from this repository.** Chosen. The tag makes the default true,
the sandbox tests the default, and the site is the one deliverable a consumer can look at
without installing anything at all.

**What a sandbox is allowed to be.** A throwaway repository under the same account, created for
this and kept afterwards as the place where the consumer path is re-tested when it changes. Not
a fork: a fork inherits this repository's `.claude/settings.json`, its content tree and its
workflows, which is the coupling the whole exercise is trying to avoid. It starts empty, the
way a real project does.

**What the sandbox iteration should be about.** It must be real work, not a placeholder, or
the test degenerates into proving that files can be written. Something small and genuinely
useful to the sandbox itself — which is what the harness is for, and what its first iteration
in any repository will look like.

**Versioning.** `plugin.json` carries a version and nothing reads it. Either the tag becomes
the source of truth and the manifest follows, or the manifest leads and the tag is derived. The
manifest leads: it is in the repository, it is reviewable in a pull request, and a tag that
disagrees with it is a mistake a test can catch. `v1` is a moving major tag, the convention
every GitHub action uses, and `v1.0.0` is the immovable one beside it.

## Not settled here

Migrating the origin repository. Still its own decision, and now genuinely cheaper than it was:
the sandbox will have shown what installing costs.

Whether `ccgh init` should write a pages workflow by default. It writes one only when `site` is
configured, which is a rule rather than a preference, and if that turns out wrong the sandbox
is where it will show.

What happens when a consumer's Bun is older than the lockfile expects. Nobody has run this on a
machine that is not mine.
