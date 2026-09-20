---
title: Site
summary: The documentation site that renders a repository's content tree, shipped inside the plugin and pointed at the project being worked on.
---

A specification read as a file path is a specification nobody reads. The site renders the
tree — domains, iterations, brainstorms, tasks, decisions and fixes — as pages, with the board
that shows where each iteration stands and the search that finds a decision by what it said.

It ships inside the plugin and reads `${CLAUDE_PROJECT_DIR}`, so a consuming repository holds
no Astro file at all. `ccgh docs` starts it; `ccgh docs --build` writes the static copy a
repository can publish.

One thing is settled here and nowhere else: what a reader sees. Which pages exist, what a
domain page shows before an iteration page, what the board groups by, and what the theme does
in the dark. The engine decides what is valid; this decides what is legible, and the two are
not the same question.
