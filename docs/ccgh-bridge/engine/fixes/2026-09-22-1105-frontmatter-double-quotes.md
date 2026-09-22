---
title: Write double-quoted YAML so a consumer's Prettier accepts it
date: 2026-09-22
issue: null
pr: null
---

# Write double-quoted YAML so a consumer's Prettier accepts it

A repository that runs `prettier --check .` in CI failed right after adopting ccgh. Two files
ccgh wrote were not in the shape Prettier wants: `.github/workflows/ccgh-push.yml` wrote
`branches-ignore: [main, 'fix/**']`, and `ccgh promote` wrote `validated_at: '2026-…Z'` into
the specification. Prettier, with `singleQuote` left at its default, rewrites both as
double-quoted, so the check fails. `launched_at` had the same problem, and so did any string
the bridge wrote back while mirroring.

The workflow template now double-quotes its pattern. Front matter is written through
`stringifyFrontMatter` in `src/model/front-matter.ts`, which `promote` and the bridge's mirror
both use. It runs gray-matter with js-yaml 4 and `quotingType: '"'`, because the js-yaml 3
bundled with gray-matter can only write single quotes. `js-yaml` and `@types/js-yaml` are new
dependencies. The mirror's rule that writes a fix record's `date` back unquoted now matches
the double-quoted form.

A consumer whose Prettier is set to `singleQuote: true` would now fail the other way. That is
the less common setting. A consumer with that setting should list `docs/` and
`.github/workflows/ccgh-*.yml` in `.prettierignore`.
