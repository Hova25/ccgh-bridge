---
title: Check every script file, and refuse a check that cannot run
date: 2026-09-21
issue: null
pr: null
---

# Check every script file, and refuse a check that cannot run

The commit hook `check-staged-files` runs the `check` commands of `ccgh.json` on the staged
files, and had two gaps that let a commit through unchecked. It only considered `.ts`, `.mts`,
`.mjs` and `.astro` files, so in a React repository every `.tsx` component, and every `.js`,
`.jsx`, `.cjs` or `.cts` file, was committed without a check. And it read the checks' combined
output as the verdict: a command that could not start, because it was misspelt or not installed,
threw with no output at all, which read as a pass. A typo in `ccgh.json` therefore turned every
check off without a word, and so did a check that failed without printing anything.

The hook now checks every JavaScript and TypeScript flavour, `.vue` and `.svelte` files, and
`.astro` as before. A command that cannot start is reported as `could not run` with the reason,
and one that exits with a failure and prints nothing is reported with its exit status, so either
refuses the commit and names the command.
