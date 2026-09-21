---
title: One iteration in the sandbox
order: 4
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# One iteration in the sandbox

Carry one iteration from brainstorm to `shipped` inside the sandbox, with its issues created
and closed by the bridge. Not a placeholder: real work the sandbox actually wants, because an
iteration about nothing degenerates into proving that files can be written.

The sandbox is a repository whose only purpose is to be a consumer. The work it wants is
therefore the record of what it is and what it proved — which is genuinely useful to it, and
is exactly the first iteration any repository writes.

**Files**

- Create: nothing here. A domain, an iteration, its tasks and a README, all in the sandbox.

**Interfaces**

- Consumes: the installed plugin from task 3.
- Produces: a `shipped` iteration in a repository that is not this one. Task 5 repairs whatever it broke.

- [ ] **Write the failing test**

The test is the lifecycle itself, and it fails at the first gate that does not hold. Write
down, before starting, which gates must hold:

1. `/ccgh:open-iteration sandbox/proving-the-consumer-path` scaffolds and prints a reference.
2. The brainstorm and the specification are written, and `ccgh validate` accepts them.
3. `/ccgh:validate-iteration` raises an approval prompt — the human gate, in a repository that never configured anything.
4. `/ccgh:launch-iteration` promotes to `active`; the push workflow creates one issue per task.
5. The task's own pull request merges; the sync workflow closes what it closed and marks the iteration `shipped`.

Gate 4 and gate 5 are the ones that have only ever run against this repository, with this
repository's token, on this repository's branches.

- [ ] **Run it to verify it fails**

Not applicable. Say so rather than inventing a red.

- [ ] **Write the implementation**

Do the five steps, in the sandbox, from a session with no flags. Use the skills rather than the
commands directly wherever a skill exists: a consumer meets the skills first, and a skill that
reads badly is a defect this task is supposed to catch.

Keep the transcript of anything that surprised you. That is what task 5 is for, and memory of
a surprise is worth less than the line that caused it.

- [ ] **Run the tests to verify they pass**

The iteration reaches `status: shipped` in the sandbox, written by the bridge, with the issues
closed and the `bot/ship` pull request merged.

Then, in this repository, nothing. The proof lives there.

- [ ] **Commit**

In the sandbox. Here, only the tick.
