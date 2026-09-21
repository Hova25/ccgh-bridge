---
title: Apply the command hooks to the PowerShell tool
date: 2026-09-21
issue: 99
pr: 98
---

# Apply the command hooks to the PowerShell tool

On Windows, Claude Code offers a PowerShell tool beside Bash, and `hooks/hooks.json` attached
the command rules to `Bash` alone. A `git commit` run through PowerShell escaped every one of
them: it could land on `main`, carry code with no iteration or fix, mix two iterations, skip the
configured checks, or write into the content tree with `Set-Content` where the frontmatter and
language hooks never look. Nothing refused it and nothing said so.

The rules that read a command now also run for `PowerShell`. What they read was taught the
PowerShell spelling of the same acts: `Set-Location`, `sl` and `pushd` move the directory a
commit is judged from, `Remove-Item` and `del` delete a test file, and `Set-Content`,
`Add-Content`, `Out-File`, `New-Item`, `Copy-Item` and `Move-Item` with their aliases write into
the content tree. Backslashed paths are read as slashed ones when matching the content root. A
command PowerShell reaches only through a variable or a script block is still not seen, as it
was not for Bash either.
