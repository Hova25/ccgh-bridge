---
name: open-fix
description: Open a fix branch and its record for a change too small to specify
arguments: [target]
---

Open a fix for `$target`, given as `<domain>/<slug>`.

One argument, like `/ccgh:validate-iteration` and `/ccgh:launch-iteration`. Split it on the
first `/`: what precedes is the domain, what follows is the slug. If `$target` carries no `/`,
stop and say so rather than guessing which half is missing.

A fix records a change too small to specify: a defect found while doing something else, a
repair of one or two files. It has no specification, no tasks, no milestone and no promotion.
Its validation is the human merging its pull request.

If the change deserves a specification — several files, a decision to make, work someone else
would need explained — stop and say so. Brainstorm an iteration instead. A fix is cheap enough
to become the way to avoid writing a specification, and that is the failure this command is
most likely to cause.

1. Check that the domain exists by listing the content directory — `docs/ccgh-bridge/` unless
   `ccgh.json` names another one:

   ```bash
   ls docs/ccgh-bridge
   ```

   If it is not there, stop and list the ones that are. Never create a domain to hold a fix.

2. Cut the branch from an updated `main`:

   ```bash
   git switch main && git pull --ff-only
   git worktree add ../worktrees/fix-<domain>-<slug> -b fix/$target main
   cd ../worktrees/fix-<domain>-<slug>
   ```

   The branch is `fix/<domain>/<slug>`, which is `$target` with the prefix; the worktree is the
   same name with the slashes turned into dashes, beside the clone. Everything that follows
   runs inside it, and the clone stays on `main` — an iteration in progress in another
   worktree is not disturbed.

3. Scaffold the record:

   ```bash
   ccgh scaffold fix $target
   ```

   It writes the fix record — the prefix is the UTC clock to the minute, read by the command,
   never typed by hand — and prints the path. The skeleton carries the title derived from the
   slug, today's `date`, `issue: null` and `pr: null`, then two placeholders:

   ```markdown
   <One paragraph: what was wrong. This becomes the body of the GitHub issue, so it is read
   by someone who has read nothing else.>

   <Then what changed, and anything a reader would otherwise have to discover.>
   ```

   Fill them with the **Edit tool** (or rewrite the whole record with the **Write tool**),
   never with a shell redirection. A hook refuses `cat >`, `tee`, `sed -i` and the rest inside
   the content tree, because the hooks that guard generated fields and English prose only see
   `Write` and `Edit`. Sharpen the title while you are there if the slug did not say it in the
   imperative.

   The nulls are scaffolding. Never write a real `issue` or `pr` number; the bridge is their
   only writer and a hook refuses the attempt.

   The minute is what tells two fixes of one day apart; the scaffold refuses to overwrite a
   file that already exists, so the same slug twice in one minute stops with the path.

4. Make the change, then commit the record and the code together:

   ```bash
   git add docs/ccgh-bridge
   git add <the files the change touched>
   git commit
   ```

   A hook refuses a commit on a `fix/` branch that stages no record, and the validation
   workflow refuses the pull request. Committing them apart is not a shortcut, it is a
   refused commit.

5. Open the pull request against `main`, labelled with the domain:

   ```bash
   gh pr create --base main --label <domain>
   ```

   Opening it makes the bridge create the issue, write its number onto the branch and add
   `Closes #n` to the pull request body. Pull before pushing again, or the next push is
   rejected. Those workflows reach a repository through `ccgh init`, which the iteration that
   builds the bridge adds; until then the issue is not created.

6. Report the pull request URL, and close with the next action as a command on its own line.

Never create the issue by hand, and never write `status` anywhere. Both have exactly one
writer.
