import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ratioOf } from "./contrast";

// The test lives with the engine, because `bun test` runs there; the stylesheet lives
// with the site, because Astro serves it. This is the crossing.
const tokensPath = new URL("../../site/src/styles/tokens.css", import.meta.url);

const sourceFiles = async (directory: string): Promise<string[]> => {
  const found: string[] = [];

  for (const item of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, item.name);

    if (item.isDirectory()) found.push(...(await sourceFiles(full)));
    else if (/\.(astro|css)$/.test(item.name)) found.push(full);
  }

  return found;
};

const blockOf = ({ source, selector }: { source: string; selector: string }): string => {
  const start = source.indexOf(selector);

  if (start === -1) throw new Error(`no block for ${selector}`);

  const open = source.indexOf("{", start);

  return source.slice(open + 1, source.indexOf("}", open));
};

const paletteOf = ({ source, selector }: { source: string; selector: string }) =>
  Object.fromEntries(
    [...blockOf({ source, selector }).matchAll(/(--[a-z-]+):\s*(#[0-9a-f]{3,8})\s*;/g)].map(
      (match) => [match[1], match[2]],
    ),
  );

const pairs = [
  { foreground: "--text", background: "--surface", minimum: 4.5 },
  { foreground: "--text", background: "--surface-raised", minimum: 4.5 },
  { foreground: "--text", background: "--surface-hover", minimum: 4.5 },
  { foreground: "--text", background: "--surface-current", minimum: 4.5 },
  { foreground: "--text-muted", background: "--surface", minimum: 4.5 },
  { foreground: "--text-muted", background: "--surface-side", minimum: 4.5 },
  { foreground: "--text-muted", background: "--surface-raised", minimum: 4.5 },
  { foreground: "--text-section", background: "--surface-side", minimum: 4.5 },
  { foreground: "--text-section", background: "--surface", minimum: 4.5 },
  { foreground: "--border", background: "--surface", minimum: 3 },
  { foreground: "--border", background: "--surface-raised", minimum: 3 },
  { foreground: "--focus", background: "--surface", minimum: 3 },
  { foreground: "--accent", background: "--surface", minimum: 4.5 },
  { foreground: "--accent", background: "--surface-current", minimum: 3 },
  { foreground: "--warn", background: "--surface", minimum: 4.5 },
];

describe.each([
  { name: "dark", selector: ":root," },
  { name: "light", selector: ':root[data-theme="light"]' },
])("the $name palette", ({ selector }) => {
  it.each(pairs)("draws $foreground on $background at $minimum:1", async (pair) => {
    const palette = paletteOf({ source: await readFile(tokensPath, "utf8"), selector });
    const ratio = ratioOf({
      foreground: palette[pair.foreground] as string,
      background: palette[pair.background] as string,
    });

    expect(ratio).toBeGreaterThanOrEqual(pair.minimum);
  });
});

describe("the light palette", () => {
  it("is the same whether the system asked for it or the reader did", async () => {
    const source = await readFile(tokensPath, "utf8");

    expect(paletteOf({ source, selector: ':root:not([data-theme="dark"])' })).toEqual(
      paletteOf({ source, selector: ':root[data-theme="light"]' }),
    );
  });
});

describe("the rest of the site", () => {
  it("names no colour of its own", async () => {
    const root = fileURLToPath(new URL("../../site/src", import.meta.url));
    const files = (await sourceFiles(root)).filter((file) => !file.endsWith("tokens.css"));
    const offenders: string[] = [];

    for (const file of files) {
      const source = await readFile(file, "utf8");
      const colours = source.match(/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/g);

      if (colours) offenders.push(`${file.split("/src/")[1]}: ${colours.join(", ")}`);
    }

    expect(offenders).toEqual([]);
  });

  it("uses no token the palette does not declare", async () => {
    const root = fileURLToPath(new URL("../../site/src", import.meta.url));
    const files = (await sourceFiles(root)).filter((file) => !file.endsWith("tokens.css"));
    const source = await readFile(tokensPath, "utf8");
    const declared = new Set(Object.keys(paletteOf({ source, selector: ":root," })));
    const dangling: string[] = [];

    for (const file of files) {
      const text = await readFile(file, "utf8");

      for (const match of text.matchAll(/var\((--[a-z-]+)\)/g)) {
        const name = match[1] as string;
        const isColour = /^--(surface|text|border|rail|accent|warn|focus)/.test(name);

        if (isColour && !declared.has(name)) dangling.push(`${file.split("/src/")[1]}: ${name}`);
      }
    }

    expect(dangling).toEqual([]);
  });
});
