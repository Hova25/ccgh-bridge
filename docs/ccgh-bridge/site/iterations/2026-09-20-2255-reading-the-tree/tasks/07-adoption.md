---
title: Adoption
order: 7
issue: null
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Adoption

Make the plugin stop promising something absent. Two skills say the documentation site does
not exist yet; they now say how to start it, and the README says what `ccgh docs` does.

This is the task the iteration exists for. A site nobody is told to open is a site nobody
opens, and the sentence that sends a writer to it is the one that makes the reading half of
the workflow real.

**Files**

- Modify: `skills/open-iteration/SKILL.md` — step 8 and step 9
- Modify: `skills/ship-iteration/SKILL.md` — the site, where it says it does not exist
- Modify: `README.md` — the status, and `ccgh docs`
- Test: `tests/plugin.test.ts` — no skill promises something absent

**Interfaces**

- Consumes: everything tasks 1 to 6 produced.
- Produces: nothing new. The iteration ends here.

- [x] **Write the failing test**

The assertion that would have caught this iteration's own starting condition:

```ts
it("promises nothing that does not exist", async () => {
  for (const name of await skills()) {
    const body = await readFile(join(root, "skills", name, "SKILL.md"), "utf8");

    expect(body, name).not.toMatch(/does not exist yet|not built yet/i);
  }
});
```

It fails today against `open-iteration` and `ship-iteration`, which is the point: the sentence
was written as a placeholder and nothing was holding it to being removed.

It will fail again the next time a skill names something unbuilt, which is the failure worth
catching — `ccgh init` is still absent, and two skills still describe what it writes. Those
two say the workflows arrive through it rather than that it does not exist, which is a
statement about where something comes from rather than a promise; if that distinction ever
stops holding, this test says so.

- [x] **Run it to verify it fails**

```bash
bun test tests/plugin.test.ts
```

- [x] **Write the implementation**

`open-iteration` step 8 becomes the command and what it shows:

```bash
ccgh docs
```

and step 9 reports the iteration's URL again — `http://localhost:4321/<domain>/<iteration>` —
rather than only the reference, because reading it on the site is what step 8 is for.

`ship-iteration` loses its sentence about the site not being built.

The README's status section stops saying the site is not built, and gains `ccgh docs` and
`ccgh docs --build` beside the commands it already lists.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then prove it from the outside, in a session started with no flags, which is how a consumer
meets it:

```bash
claude
```

Ask for `/ccgh:open-iteration` to be read. It names `ccgh docs`, the command exists, and
running it serves this repository's own tree — three domains, four iterations, the board and
the search. The workflow can be written and read.

- [x] **Commit**
