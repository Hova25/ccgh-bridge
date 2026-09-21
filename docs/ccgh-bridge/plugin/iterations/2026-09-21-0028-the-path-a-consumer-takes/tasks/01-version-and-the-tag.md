---
title: Version and the tag
order: 1
issue: 75
github:
  state: null
  pr: null
  merged_at: null
  synced_at: null
---

# Version and the tag

Make `v1` exist, and make it impossible to forget what it points at. `ccgh init` has defaulted
to `Hova25/ccgh-bridge@v1` since the day it was written, and every repository that ran it got
five workflows that fail at `uses:`.

The manifest leads. `plugin.json` carries the version, it is reviewable in a pull request, and
a tag that disagrees with it is a mistake a test can name.

**Files**

- Test: `tests/plugin.test.ts` — the version's shape, and the tags that exist
- Modify: `.claude-plugin/plugin.json` — `1.0.0`
- Modify: `README.md` — how a version is cut

**Interfaces**

- Consumes: nothing.
- Produces: the tags `v1.0.0` and `v1`. Task 3 installs from them; task 2's workflow does not care.

- [x] **Write the failing test**

```ts
describe("the version", () => {
  it("is a whole version, not a placeholder", async () => {
    expect((await manifest()).version).toMatch(/^\d+\.\d+\.\d+$/);
    expect((await manifest()).version).not.toBe("0.1.0");
  });

  it("agrees with the tag this commit carries, when it carries one", () => {
    const tag = Bun.spawnSync(["git", "tag", "--points-at", "HEAD"]).stdout.toString().trim();

    for (const name of tag.split("\n").filter((line) => /^v\d+\.\d+\.\d+$/.test(line))) {
      expect(name).toBe(`v${version}`);
    }
  });
});
```

The second is the one that earns its place. It says nothing on an ordinary commit and refuses
the one case that matters: a release tag on a commit whose manifest says something else.

- [x] **Run it to verify it fails**

```bash
bun test tests/plugin.test.ts
```

- [x] **Write the implementation**

`plugin.json` becomes `1.0.0`. The README gains four lines saying what a release is: bump the
manifest, merge, tag `v<version>`, move `v1`.

- [x] **Run the tests to verify they pass**

```bash
bun run verify
```

Then, after this task's pull request has merged and `main` carries `1.0.0`:

```bash
git tag -a v1.0.0 -m "The engine, the plugin, the site and the bridge"
git tag -f v1
git push origin v1.0.0 && git push -f origin v1
```

And check the thing the tag exists for:

```bash
gh api repos/Hova25/ccgh-bridge/contents/action.yml?ref=v1 --jq .name
```

A reference that GitHub can resolve is the whole deliverable.

- [x] **Commit**
