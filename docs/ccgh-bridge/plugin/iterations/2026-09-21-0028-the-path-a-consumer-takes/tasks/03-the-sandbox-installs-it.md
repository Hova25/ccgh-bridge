---
title: The sandbox installs it
order: 3
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# The sandbox installs it

The first thing in this project that is not a rehearsal. A repository that has never seen this
code installs the plugin by name, from the marketplace, and runs `ccgh init` with the default
reference.

Four things happen here that have never happened: an install from a marketplace, a plugin
loaded from a cache directory, `ccgh` on the PATH without a local checkout, and workflows
pointing at a tag rather than at `./`.

**Files**

- Create: nothing in this repository. Everything happens in the sandbox.
- Test: `docs/ccgh-bridge/plugin/iterations/…/tasks/03…` is its own record; what it produces is a transcript, kept in task 5 if anything broke.

**Interfaces**

- Consumes: the tags from task 1.
- Produces: a sandbox repository with the plugin installed and five workflows pointing at `Hova25/ccgh-bridge@v1`. Task 4 works inside it.

- [ ] **Write the failing test**

There is nothing to assert in this repository, and pretending otherwise would produce a test
that asserts a string. The test is the sequence below, and it fails today at the first step
because `v1` did not exist until task 1.

State before starting, in the pull request, what each step must print. A step whose expected
output is written afterwards is a step that proved nothing.

- [ ] **Run it to verify it fails**

Not applicable, and saying so is better than inventing a red.

- [ ] **Write the implementation**

```bash
gh repo create ccgh-sandbox --public --description "Proving the path a consumer takes" --clone
cd ccgh-sandbox
```

Then, from a session opened there with no flags:

```
/plugin marketplace add Hova25/ccgh-bridge
/plugin install ccgh@ccgh-bridge
```

And in that session:

```bash
ccgh validate
ccgh init
```

`ccgh validate` must refuse, naming `docs/ccgh-bridge` — there is no content yet, and the
refusal is the proof that the command resolved the sandbox rather than this repository.

`ccgh init` must write five workflows saying `uses: Hova25/ccgh-bridge@v1`.

- [ ] **Run the tests to verify they pass**

Commit the workflows in the sandbox, push, and read the runs. `ccgh-validate` fires on the push
and must resolve the action from the tag. That run is the deliverable of this task: everything
before it was this repository testing itself.

- [ ] **Commit**

In the sandbox. This repository's only change is ticking this file.
