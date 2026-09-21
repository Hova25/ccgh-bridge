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

1. Read the prefix, the UTC clock to the minute, and name the iteration with it:

   ```bash
   date -u +%Y-%m-%d-%H%M
   ```

   The reference is `<domain>/<prefix>-<slug>`, and the worktree is named after it with the
   slash turned into a dash.

2. Cut the branch and its worktree from an updated `main`, and move into it:

   ```bash
   git switch main && git pull --ff-only
   git worktree add ../worktrees/<domain>-<prefix>-<slug> -b <domain>/<prefix>-<slug> main
   cd ../worktrees/<domain>-<prefix>-<slug>
   ```

   Everything that follows runs inside it; nothing is written in the clone.

3. Check that the domain exists by listing the content directory — `docs/ccgh-bridge/` unless
   `ccgh.json` names another one. When it does not, create it here, so that it arrives with the
   iteration:

   ```bash
   ccgh scaffold domain <domain>
   ```

   Replace the summary it writes with one sentence naming what the domain owns.

4. Scaffold the brainstorm and the specification at the prefix of step 1:

   ```bash
   ccgh scaffold iteration $target --at <prefix>
   ```

   It prints the files it wrote and then the reference, which must be the branch's name. It
   refuses an iteration that already exists at that prefix; read the clock again and start
   over rather than suffixing it by hand.

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

8. Start the documentation site, so that the brainstorm, the specification and the tasks are
   read on the site rather than from file paths:

   ```bash
   ccgh docs
   ```

   It keeps running after the command returns, and a second `ccgh docs` reports the port the
   first one took rather than starting another. `astro dev stop` inside the plugin's `site/`
   is what stops it.

9. Report the reference and the iteration's URL,
   `http://localhost:4321/<domain>/<yyyy-mm-dd-HHMM>-<slug>`, and close with the next action
   as a command on its own line:

   ```
   /ccgh:validate-iteration <reference>
   ```

The command writes `status: draft`, `issue: null` and the null `github:` block. Never change
any of them by hand: `draft` is the only status anyone may write, and a hook refuses the rest.
