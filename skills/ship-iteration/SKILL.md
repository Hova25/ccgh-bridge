---
name: ship-iteration
description: Open the pull request that lands an active iteration on main, naming every task issue so the merge closes them
arguments: [reference]
---

Open the pull request that ships `$reference` — its branch into `main` — with a `Closes` line
for every task, so that the merge closes the issues.

Why this is a command rather than a habit: `Closes #n` on a task pull request never fires,
because that pull request targets the iteration branch, and `main` is merged with `--merge`,
so no closing keyword ever reaches the default branch by accident. The body of the shipping
pull request is the only place left that can close the task issues, and a body written by hand
forgets them — it once did, and six issues had to be closed by hand afterwards.

Paths below are written against the content directory, `docs/ccgh-bridge/` unless `ccgh.json`
names another one.

1. Read the reference. Split `$reference` on the first `/` into domain and iteration, and
   check the specification is `active`:

   ```bash
   grep -n "^status:" docs/ccgh-bridge/<domain>/iterations/<iteration>/spec.md
   ```

   If it is not `active`, stop and say so: a `ready` iteration has no issues to close, a
   `shipped` one is already done.

2. Collect the tasks. Every task file must carry an issue number and a pull request number in
   its mirror block:

   ```bash
   grep -H "^issue:" docs/ccgh-bridge/<domain>/iterations/<iteration>/tasks/*.md
   grep -H "^  pr:" docs/ccgh-bridge/<domain>/iterations/<iteration>/tasks/*.md
   ```

   A task without an issue number means the launch never wrote it back: stop and name it. A
   task whose pull request number is `null` is not merged: stop and list them. Shipping with a
   task still open is the human's decision, taken by merging that task first, never by
   leaving it out of the list.

   In a repository that has not run `ccgh init`, no workflow ever writes those numbers. Say so
   rather than treating the nulls as a blocker the human can clear.

3. Make sure the branch is on the remote and the local copy is not ahead of it:

   ```bash
   git fetch origin <reference>
   git status -sb
   ```

   Run this from the iteration's worktree, `../worktrees/<domain>-<iteration>`. If the local
   branch is ahead, push before opening anything.

4. Open the pull request, unless one already exists for this head — `gh pr list --head
   <reference> --base main --state open` says so; then report its URL, check its body carries
   every `Closes` line, and add the missing ones with `gh pr edit <number> --body`. Editing
   the body before the merge is what makes them fire.

   ```bash
   gh pr create --base main --head <reference> --label <domain> --title "Ship <reference>" --body "<the body described below>"
   ```

5. Explain what the merge does, because it is three steps and only the first is visible: the
   `Closes` lines fire at the merge into `main` and the issues close; each closure runs the
   `sync` workflow, which finds every task closed and marks the iteration `shipped`; the
   branch having been deleted by the merge, that last write arrives as a `bot/ship/<reference>`
   pull request to `main`, labelled `completed`, which the human merges too.

6. Close with the next action as a command on its own line:

   ```
   gh pr merge <number> --merge --delete-branch
   ```

## Writing the body

Concise and factual, in this order, nothing else:

- One sentence saying what the iteration delivers, from the specification's problem and goals.
- The counts: number of tasks, number of issues.
- One line per task, in task order, containing only `Closes #<issue>`. Nothing else on the
  line: GitHub reads the keyword at the start of a line.
- One sentence saying what the merge triggers, as in step 5.
- The attribution line the session uses for pull requests.

Never close an issue by hand and never write `status`. The merge closes issues and the bridge
writes status; both have exactly one writer.
