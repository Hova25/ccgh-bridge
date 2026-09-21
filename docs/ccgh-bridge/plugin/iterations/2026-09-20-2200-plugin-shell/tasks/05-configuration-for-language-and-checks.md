---
title: Configuration for language and checks
order: 5
issue: 49
github:
  state: closed
  pr: null
  merged_at: null
  synced_at: '2026-09-21T00:10:47.258Z'
---

# Configuration for language and checks

Two of the eight rules describe one team rather than one workflow, and they are the two that
would otherwise make this plugin unusable elsewhere. `check-staged-files` runs a particular
repository's checker; `enforce-language` refuses a particular repository's other language.
Both start reading `ccgh.json`.

This is the only task in the iteration that changes behaviour rather than moving it, which
is why it is its own task and why its tests come before its code.

**Files**

- Create: `src/configuration.ts`
- Test: `src/configuration.test.ts`
- Modify: `hooks/rules/check-staged-files.ts`, `hooks/rules/enforce-language.ts`
- Modify: `hooks/rules/check-staged-files.test.ts`, `hooks/rules/enforce-language.test.ts`
- Modify: `ccgh.json` — this repository's own, created here

**Interfaces**

- Consumes: `repositoryRoot` from `src/project` (the engine), and the two rules from task 3.
- Produces: `const configuration = ({ from }: { from: string }): Configuration` from `src/configuration.ts`, where `type Configuration = { content?: string; check?: string[]; language?: { refuse: string[] } }`. `contentRoot` keeps its own reading of the file; this is the general one, and later iterations add keys to it rather than to `contentRoot`.

- [ ] **Write the failing test**

`src/configuration.test.ts` covers the file itself:

```ts
it("returns an empty configuration when there is no ccgh.json", () => {
  expect(configuration({ from: root })).toEqual({});
});

it("refuses a malformed file rather than returning an empty configuration", async () => {
  await writeFile(join(root, "ccgh.json"), "{ not json", "utf8");

  expect(() => configuration({ from: root })).toThrow(/ccgh\.json is not valid JSON/);
});

it("ignores keys it does not know, so a newer file does not break an older command", async () => {
  await writeFile(join(root, "ccgh.json"), '{ "content": "x", "future": 1 }', "utf8");

  expect(configuration({ from: root }).content).toBe("x");
});
```

Then the two rules. `check-staged-files`:

```ts
it("is inert when the repository configures no check", () => {
  expect(decide({ input: commit, context: fake({ check: undefined, staged: ["a.ts"] }) })).toBeNull();
});

it("runs what the repository configured, and refuses what fails", () => {
  expect(decide({ input: commit, context: fake({ failures: "a.ts: no semicolon" }) })).toContain(
    "a.ts: no semicolon",
  );
});
```

`enforce-language`:

```ts
it("refuses French by default, because that is the list it ships with", () => {
  expect(decide({ input: write("Ceci est une phrase avec des mots."), context: fake({}) })).not.toBeNull();
});

it("is silent when the repository configures an empty list", () => {
  expect(
    decide({ input: write("Ceci est une phrase avec des mots."), context: fake({ refuse: [] }) }),
  ).toBeNull();
});

it("refuses what the repository listed instead", () => {
  expect(
    decide({ input: write("Dies ist ein Satz."), context: fake({ refuse: ["dies", "ist", "ein"] }) }),
  ).not.toBeNull();
});
```

The middle one is the important assertion, and the reason the default is worth stating out
loud: a repository that writes French is refused until it says so.

- [ ] **Run it to verify it fails**

```bash
bun test src/configuration.test.ts hooks/rules/check-staged-files.test.ts hooks/rules/enforce-language.test.ts
```

- [ ] **Write the implementation**

`src/configuration.ts` reads `ccgh.json` at the repository root, parses it, and returns `{}`
when the file is absent. It throws on malformed JSON, for the reason the engine already
throws: a silent fallback runs the wrong checks and reports success.

The `Context` from task 3 gains `configuration()`, so the rules stay pure and the file is
read once, at the entry point.

`check-staged-files` takes its commands from `check`. With none, it returns `null` before
running anything — an unconfigured repository gets no checks rather than somebody else's. Its
refusal stops naming `pnpm lint:fix` and names the commands it ran.

`enforce-language` takes its word list from `language.refuse`, falling back to the built-in
French list. `{ "refuse": [] }` silences it.

This repository's own `ccgh.json` is created here:

```json
{ "check": ["bun run lint"] }
```

No `content`: `docs/ccgh-bridge/` is the convention and this repository follows it. No
`language`: the built-in list is what it wants.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

- [ ] **Commit**
