---
title: Make content paths and line endings work on Windows
date: 2026-09-21
issue: null
pr: 85
---

# Make content paths and line endings work on Windows

On Windows, `ccgh validate` refused every file of a well-formed tree, and the hooks allowed
what they exist to refuse. Content paths were built with the platform's separator —
`harness\index.md`, `docs\ccgh-bridge` — while every rule matches forward-slash shapes; a
checkout under `core.autocrlf` handed the rules `\r\n`, and they split on `\n`; and Claude Code
passes a hook `file_path` with backslashes, so `protect-generated-frontmatter` never recognised
a file as content. Thirty-seven tests failed on a Windows machine for the same reasons.

Paths are now written with forward slashes wherever they leave `node:path`: `contentDirectory`
in `src/project.ts` replaces the three copies of `relative(repositoryRoot, contentRoot)`, the
loader turns each file's relative path to forward slashes, and the hook entry point normalises
`file_path` once, before any rule sees it. The loader also reads `\r\n` as `\n`, so a consumer
that never adds a `.gitattributes` is still read correctly.

This repository gains a `.gitattributes` forcing LF, and an `.editorconfig`, so that a Windows
clone matches what CI and Biome expect. The tests that located the repository through
`URL.pathname` — `/C:/…` on Windows — use `fileURLToPath`, and the integration test's temporary
clones set `core.autocrlf=false` so that it no longer depends on the machine's git
configuration.

The iteration-branch integration tests still take seven to nine seconds each on Windows when
the whole suite runs, past the default timeout; alone they pass. That is the speed of git on
the platform, not a defect, and is left alone here.
