---
name: open-iteration
description: Scaffold a new iteration's brainstorm and specification, and add task files to it
arguments: [target]
---

Scaffold the iteration `$target`, given as `<domain>/<slug>` without a date. The command
prefixes the slug with the UTC clock to the minute, `<yyyy-mm-dd-HHMM>`, and refuses to
overwrite a directory that already exists.

This writes skeletons, not content. Everything it produces says `<…>` where prose belongs, and
the iteration is worth nothing until that prose is written. If the work has not been
brainstormed, stop and brainstorm it first: a specification written straight into a skeleton is
a specification nobody argued with.

1. Check the domain exists by listing the content directory — `docs/ccgh-bridge/` unless
   `ccgh.json` names another one:

   ```bash
   ls docs/ccgh-bridge
   ```

   If the domain is not there, stop and list the ones that are. Creating a domain is a
   decision, not a side effect of scaffolding one iteration.

2. Cut the branch from an updated `main`:

   ```bash
   git switch main && git pull --ff-only
   ```

   The branch is named after the iteration, which is only known once the command has resolved
   the date, so it is cut in step 4.

3. Scaffold the brainstorm and the specification:

   ```bash
   ccgh scaffold iteration $target
   ```

   It prints the files it wrote and then the reference, `<domain>/<yyyy-mm-dd-HHMM>-<slug>`.
   That reference is what every later command takes, and what the worktree is named after.

4. Cut the branch, using the reference the command printed:

   ```bash
   git worktree add ../worktrees/<domain>-<iteration> -b <reference> main
   cd ../worktrees/<domain>-<iteration>
   ```

   The worktree is named after the branch with the slash turned into a dash. Everything that
   follows runs inside it.

5. Write the brainstorm, then the specification, replacing every `<…>` placeholder. Use the
   `superpowers:brainstorming` and `/ccgh:write-spec` skills rather than filling the headings
   in order; the headings are a shape, not a method.

   A specification that still contains a `<…>` is not finished, and the promotion will carry
   the placeholder into a pull request for everyone to read.

6. Add each task once the specification is written:

   ```bash
   ccgh scaffold task <reference> <slug>
   ```

   The order prefix is the count of task files already there, so tasks are added in the order
   they will run. Write each one with the `/ccgh:decompose-into-tasks` skill: real code, real
   test commands, and the **Files** and **Interfaces** sections the validator demands.

7. Validate the content and commit:

   ```bash
   ccgh validate
   git add docs/ccgh-bridge
   git commit
   ```

8. The documentation site is not built yet. When it is, `ccgh docs` starts it, and the
   brainstorm, the specification and the tasks are read there rather than from file paths.
   Until then, read them as files.

9. Report the reference, and close with the next action as a command on its own line:

   ```
   /ccgh:validate-iteration <reference>
   ```

The command writes `status: draft`, `issue: null` and the null `github:` block. Never change
any of them by hand: `draft` is the only status anyone may write, and a hook refuses the rest.
