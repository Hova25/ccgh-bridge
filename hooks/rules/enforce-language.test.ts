import { describe, expect, it } from "bun:test";
import { fake } from "../fake-context";
import { decide } from "./enforce-language";

const write = (content: string) => {
  return { tool_name: "Write", tool_input: { file_path: "src/a.ts", content } };
};

const commit = (message: string) => {
  return { tool_name: "Bash", tool_input: { command: `git commit -m "${message}"` } };
};

describe("enforce-language", () => {
  it("accepts English prose", () => {
    expect(
      decide({
        context: fake({}),
        input: write("// the session is closed when the user signs out"),
      }),
    ).toBeNull();
  });

  it("accepts a single ambiguous word", () => {
    expect(
      decide({ context: fake({}), input: write("const note = frequencyOf('sur');") }),
    ).toBeNull();
  });

  it("refuses a French comment", () => {
    expect(
      decide({
        context: fake({}),
        input: write("// la session est fermee quand tous les jetons expirent"),
      }),
    ).toMatch(/English/);
  });

  it("refuses a French test name", () => {
    expect(
      decide({
        context: fake({}),
        input: write('it("retourne une erreur pour tous les identifiants", () => {});'),
      }),
    ).not.toBeNull();
  });

  it("refuses a French commit message", () => {
    expect(
      decide({
        context: fake({}),
        input: commit("corrige le bug dans une validation sans schema"),
      }),
    ).not.toBeNull();
  });

  it("names the words it found", () => {
    expect(
      decide({ context: fake({}), input: write("// pour une session dans le cache") }),
    ).toMatch(/pour/);
  });
});
