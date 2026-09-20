---
name: validate-iteration
description: Validate an iteration, move it from draft to ready, and open its pull request
arguments: [reference]
disable-model-invocation: true
---

Promote `$reference` from `draft` to `ready`, then open the pull request that records the decision.

1. Run the dry run and show its complete output to the user:

   ```bash
   ccgh promote $reference --to ready --dry-run
   ```

2. If it reports blockers, stop. Explain each one and what would resolve it. Do not attempt
   the real promotion.

3. If it succeeds, summarise for the user in one short paragraph: how many tasks, which
   domains the iteration impacts, and the status of each dependency.

4. Then run the real promotion:

   ```bash
   ccgh promote $reference --to ready
   ```

   This raises an approval prompt. That prompt is the validation gate: if the user declines,
   report it plainly, change nothing, and do not continue to the next steps.

5. Commit the promoted specification and push the branch:

   ```bash
   git add docs/ccgh-bridge
   git commit -m "Validate $reference"
   git push -u origin HEAD
   ```

   Never commit files belonging to another iteration alongside it.

6. Open the pull request:

   ```bash
   gh pr create --title "Validate $reference" --body "<the body described below>"
   ```

   If `gh` reports that it is not authenticated, stop and tell the user to run
   `gh auth login`. Do not look for another way to reach the API.

   If a pull request already exists for this branch, `gh` says so. Do not create a second
   one: report the existing URL instead.

7. Merge it. The human already approved this at the promotion prompt; the pull request is a
   record, not a second gate.

   ```bash
   gh pr merge --merge --delete-branch
   ```

8. Hand back a branch cut from the updated `main`, so the work can start:

   ```bash
   git switch main && git pull --ff-only
   git worktree add ../worktrees/<domain>-<iteration> -b $reference main
   ```

   The worktree the iteration was written in was cut from the old `main` and its branch is now
   merged. Remove it, so that the work starts in a fresh one named the same way. Tell the user
   the directory to `cd` into.

   ```bash
   git worktree remove ../worktrees/<domain>-<iteration>
   ```

9. Report the merged pull request URL, and remind the user that `ready` creates no issue. The
   iteration waits in the backlog until `/ccgh:launch-iteration`.

10. Close with the next action as a command on its own line, never as a sentence describing
    it:

    ```
    /ccgh:launch-iteration $reference
    ```

## Writing the body

Concise and factual. No preamble, no restating the workflow, no summary of what the reader
can see in the diff. Four parts, nothing else:

- One sentence saying what the iteration delivers, taken from the specification's problem
  and goals, not copied verbatim from its title.
- The counts that matter: number of tasks, dependencies (with their status), impacted
  domains. Omit a line that would say "none".
- Anything a reviewer would otherwise have to discover: a risk the specification records, a
  decision that was contested, a deliberate non-goal likely to be mistaken for an omission.
- The single line `No issue created; /ccgh:launch-iteration does that.`

Aim for something a reviewer reads in fifteen seconds. If a sentence does not change what
they would do, cut it.

The specification and its tasks reach `main` now rather than when the iteration ships, because
the bridge writes `blob/main/...` links into every issue it creates. A specification that
stayed on its branch would leave every one of those links broken until the merge.

Never edit `status` in a specification yourself. The promotion command is the only writer,
and a hook will refuse the attempt.
