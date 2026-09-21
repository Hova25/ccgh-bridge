---
title: Adoption
order: 6
issue: 50
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Adoption

Make this repository use the plugin it ships. Until now the plugin has been loaded with a
flag, by someone who remembered to type it; after this task it is enabled by the repository,
for anyone who opens it.

This is the task the iteration exists for. Three iterations will be specified against this
plugin, and a plugin nobody has run is a plugin nobody knows is broken.

**Files**

- Create: `.claude-plugin/marketplace.json`
- Create: `.claude/settings.json`
- Modify: `README.md` — how to install it, and what it gives
- Test: `tests/plugin.test.ts` — the marketplace entry and the manifest agree

**Interfaces**

- Consumes: everything tasks 1 to 5 produced.
- Produces: the marketplace name `ccgh-bridge` and the plugin name `ccgh`, so the installed identifier is `ccgh@ccgh-bridge`. The iteration that publishes remotely keeps both names.

- [ ] **Write the failing test**

Add to `tests/plugin.test.ts`:

```ts
describe("the marketplace entry", () => {
  it("points at a plugin that exists, by the name the manifest declares", async () => {
    const entry = JSON.parse(await readFile(join(root, ".claude-plugin/marketplace.json"), "utf8"));

    expect(entry.plugins).toHaveLength(1);
    expect(entry.plugins[0].name).toBe((await manifest()).name);
  });

  it("is the marketplace this repository's settings enable", async () => {
    const entry = JSON.parse(await readFile(join(root, ".claude-plugin/marketplace.json"), "utf8"));
    const settings = JSON.parse(await readFile(join(root, ".claude/settings.json"), "utf8"));

    expect(Object.keys(settings.extraKnownMarketplaces)).toEqual([entry.name]);
    expect(Object.keys(settings.enabledPlugins)).toEqual([`${entry.plugins[0].name}@${entry.name}`]);
  });
});
```

Two files naming each other by hand is two files that drift. The test is cheap and the
failure it prevents — a plugin enabled under a name nothing provides — reports as "not
installed" with no explanation.

- [ ] **Run it to verify it fails**

```bash
bun test tests/plugin.test.ts
```

- [ ] **Write the implementation**

`.claude-plugin/marketplace.json` declares one plugin, sourced from the repository itself:

```json
{
  "name": "ccgh-bridge",
  "owner": { "name": "Hova25" },
  "plugins": [{ "name": "ccgh", "source": "./", "description": "The development lifecycle this repository ships." }]
}
```

`.claude/settings.json` registers that marketplace as a local source and enables the plugin.
It grants no permissions: a plugin cannot contribute allow-rules, and `ccgh promote` is
deliberately left to prompt every time, because it is the gate a human passes.

The README gains the two things a reader needs and does not have: the install command, and
the sentence that Bun must be present first.

- [ ] **Run the tests to verify they pass**

```bash
bun run verify
```

Then prove it from the outside, in a session started with no flags:

```bash
claude
```

Four things must be true, and none of them can be checked from the test suite:

1. `/help` lists eight skills under `ccgh`.
2. `ccgh validate` runs in the Bash tool without a path.
3. A commit on `main` is refused, naming the branch.
4. `ccgh promote` raises an approval prompt rather than running.

The fourth is the one to check most carefully. If it ever stops prompting, the human gate is
gone and nothing else in this repository will notice.

- [ ] **Commit**
