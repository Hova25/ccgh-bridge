---
name: launch-iteration
description: Launch a ready iteration, creating one GitHub issue per task
arguments: [reference]
disable-model-invocation: true
---

Promote `$reference` from `ready` to `active`.

1. Run the dry run and show its complete output to the user:

   ```bash
   ccgh promote $reference --to active --dry-run
   ```

2. If it reports blockers, stop and name what blocks the launch. A dependency that is not
   `shipped` is the most common cause; say which one and what state it is in.

3. If it succeeds, list every task title that is about to become a GitHub issue, numbered,
   exactly as the dry run printed them. The user must see the full list before approving:
   this is the promise that no issue ever appears unseen.

4. Then run the real promotion:

   ```bash
   ccgh promote $reference --to active
   ```

   This raises an approval prompt. If the user declines, report it plainly and change
   nothing.

5. On success, explain what happens next. The change is committed on a branch and pushed, and
   the `documentation-to-github` workflow reacts to that **push** — not to the merge — by
   opening one issue per task and committing their numbers back onto the same branch. Pull
   before pushing again.

   Say this plainly, because it is the opposite of what it looks like: the issues exist before
   the pull request is merged, and closing that pull request without merging would leave them
   behind. The merge into `main` is what makes `Closes` fire later, at the end of the
   iteration.

   That workflow reaches a repository through `ccgh init`, which the iteration that builds the
   bridge adds. In a repository that has not run it, no issue is created and the numbers stay
   `null`; say so rather than waiting for them.

6. Close with the next action as a command on its own line, never as a sentence describing
   it. After a launch that is the first task's branch; after a merge it is the command that
   follows. If nothing is required from the user, say so in as many words.

Never edit `status` in a specification yourself, and never create issues by hand. Both have
exactly one writer.
