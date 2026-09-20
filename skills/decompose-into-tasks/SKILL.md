---
name: decompose-into-tasks
description: Use when a specification is written and needs to be broken into the tasks that will become its GitHub issues, each independently testable.
---

# Decomposing a specification into tasks

Write to the task file that `ccgh scaffold task <reference> <slug>` reported. The scaffold
numbers it from the count already there and prints the path; take it from there rather than
composing one.

Front matter: `title`, `order`, `issue: null`, and a `github:` block whose every value is
`null`. Those nulls are scaffolding; the GitHub bridge fills them in later, and a hook
refuses any other writer.

Each task becomes the body of one GitHub issue, and whoever picks it up will not have read
the others. So each task states: the files it creates or modifies, the interfaces it consumes
from earlier tasks and the ones it produces for later tasks, and the full test cycle. Write
the actual test and the actual implementation, not a description of them. "Similar to task 3"
is a failure: repeat the content.

Size a task so that it carries one test cycle and could be accepted or rejected on its own.
Fold setup, configuration and documentation into the task whose deliverable needs them.

Order tasks so that each one's dependencies come before it. Do not add dependency fields
between tasks; `order` is the only sequencing the contract has.

Run `ccgh validate` before finishing.

Never write a real `issue` number or a non-null value under `github:`.
