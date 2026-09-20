import { describe, expect, it } from "bun:test";
import { ratioOf } from "./contrast";

describe("ratioOf", () => {
  it("returns 21 for black against white", () => {
    expect(ratioOf({ foreground: "#000000", background: "#ffffff" })).toBeCloseTo(21, 2);
  });

  it("returns 1 for a colour against itself", () => {
    expect(ratioOf({ foreground: "#7fd1b9", background: "#7fd1b9" })).toBeCloseTo(1, 5);
  });

  it("does not care which of the two is the lighter", () => {
    const light = ratioOf({ foreground: "#ffffff", background: "#0f1115" });
    const dark = ratioOf({ foreground: "#0f1115", background: "#ffffff" });

    expect(light).toBeCloseTo(dark, 5);
  });

  it("expands three-digit hex", () => {
    expect(ratioOf({ foreground: "#fff", background: "#000" })).toBeCloseTo(21, 2);
  });

  it("measures the pairs this iteration exists to repair", () => {
    expect(ratioOf({ foreground: "#4d545e", background: "#0f1115" })).toBeCloseTo(2.47, 2);
    expect(ratioOf({ foreground: "#21252c", background: "#0f1115" })).toBeCloseTo(1.23, 2);
    expect(ratioOf({ foreground: "#0f1115", background: "#151921" })).toBeCloseTo(1.07, 2);
  });

  it("refuses what it cannot measure", () => {
    expect(() => ratioOf({ foreground: "rebeccapurple", background: "#000" })).toThrow();
    expect(() => ratioOf({ foreground: "#12345", background: "#000" })).toThrow();
  });
});
