---
title: Default content root collided with a repository s own docs
date: 2026-09-20
issue: null
pr: null
---

# Default content root collided with a repository's own docs

The content root resolved to `docs/` by convention, so every file a repository already kept
there was read as content. A repository that documents itself — which is most of them —
became invalid the moment `ccgh validate` ran in it, one failure per file:

```
$ ccgh validate
README.md: does not match any known content shape
guides/deploy.md: does not match any known content shape
2 problem(s) found
```

The rule reporting those files is not the defect. "Does not match any known content shape"
is what catches a specification filed in the wrong place, and softening it would trade a
loud, correct complaint for a silent, wrong one.

The convention now names a directory of the harness's own, `docs/ccgh-bridge/`, so a
repository's documentation and the harness's content sit side by side without either having
to know about the other. `ccgh.json` still overrides it, unchanged; what moved is the
default, which is what a repository gets when it says nothing.

This repository moved with it: its content is at `docs/ccgh-bridge/engine/` rather than
`docs/engine/`, because a default the tool's own repository opts out of is not a default.

The six command tests that failed had built their fixtures at `docs/`, which is how a
convention written in a dozen places announces that it was written in a dozen places. They
name the content directory once each now.

Recorded here rather than folded into an iteration because it repairs something already
shipped, and found by a reader asking what `ccgh init` would create.
