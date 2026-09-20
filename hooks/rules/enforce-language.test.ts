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
        context: fake({ configuration: () => ({}) }),
        input: write("// the session is closed when the user signs out"),
      }),
    ).toBeNull();
  });

  it("accepts a single ambiguous word", () => {
    expect(
      decide({
        context: fake({ configuration: () => ({}) }),
        input: write("const note = frequencyOf('sur');"),
      }),
    ).toBeNull();
  });

  it("refuses a French comment", () => {
    expect(
      decide({
        context: fake({ configuration: () => ({}) }),
        input: write("// la session est fermee quand tous les jetons expirent"),
      }),
    ).toMatch(/est, quand, tous/);
  });

  it("refuses a French test name", () => {
    expect(
      decide({
        context: fake({ configuration: () => ({}) }),
        input: write('it("retourne une erreur pour tous les identifiants", () => {});'),
      }),
    ).not.toBeNull();
  });

  it("refuses a French commit message", () => {
    expect(
      decide({
        context: fake({ configuration: () => ({}) }),
        input: commit("corrige le bug dans une validation sans schema"),
      }),
    ).not.toBeNull();
  });

  it("names the words it found", () => {
    expect(
      decide({
        context: fake({ configuration: () => ({}) }),
        input: write("// pour une session dans le cache"),
      }),
    ).toMatch(/pour/);
  });

  it("is silent when the repository configures an empty list", () => {
    const decision = decide({
      input: write("Ceci est une phrase avec des mots."),
      context: fake({ configuration: () => ({ language: { refuse: [] } }) }),
    });

    expect(decision).toBeNull();
  });

  it("refuses what the repository listed instead", () => {
    const decision = decide({
      input: write("Dies ist ein Satz mit Woertern."),
      context: fake({ configuration: () => ({ language: { refuse: ["dies", "ist", "ein"] } }) }),
    });

    expect(decision).not.toBeNull();
  });
});
