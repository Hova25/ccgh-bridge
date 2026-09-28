---
title: Give the content loader a file URL rather than a path
date: 2026-09-28
issue: 136
pr: 135
---

# Give the content loader a file URL rather than a path

`ccgh docs` never started on Windows. It exited with `Dev server process exited before
becoming ready`, and the real error was only in `site/.astro/dev.log`, where Astro 7's
supervisor leaves the output of the server it spawns: `The URL must be of scheme file`, thrown
by `fileURLToPath` inside Astro's glob loader. The loader resolves its base with
`new URL(base, root)`, and `site/src/content.config.ts` handed it `process.env.CCGH_CONTENT`,
which `src/commands/docs.ts` sets to a filesystem path. On Windows that path starts
`C:\`, which a URL parser reads as the scheme `c:` rather than as a drive letter, so nothing
resolved and no collection ever loaded.

The base is now built with `pathToFileURL`. This is not only a Windows repair: the same parser
reads a `#` or a `?` anywhere in the path as the start of a fragment or a query, so a
repository checked out under a directory containing either character failed the same way on
macOS and on Linux, silently loading nothing instead of refusing. `pathToFileURL` encodes both,
and turns a drive letter into an authority-less `file:///C:/…`, so one call covers the three
platforms. The environment variable keeps carrying a plain path, which is what a person setting
it by hand would write; the conversion belongs at the one place that calls `glob`.

Checked on Windows: `bun bin/ccgh docs` serves the four domains, and `bun bin/ccgh docs
--build` writes 80 pages. The macOS and Linux behaviour rests on `pathToFileURL` being the
platform-agnostic conversion, not on a run.
