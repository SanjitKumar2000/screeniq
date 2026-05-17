import { describe, it, expect } from "vitest";

import { parseScore, scoreColorClass } from "./score";

describe("parseScore", () => {
  it.each([
    ["7", 7],
    ["7.3", 7.3],
    ["Seven", 7],
    ["seven", 7],
    ["8/10", 8],
    ["9 out of 10", 9],
    ["Score: 6.5", 6.5],
    ["0", 1], // clamped low
    ["11", 10], // clamped high
  ])("parses %s → %s", (input, expected) => {
    expect(parseScore(input)).toBe(expected);
  });

  it("returns null for unparseable input", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore("no idea")).toBeNull();
    expect(parseScore(null)).toBeNull();
    expect(parseScore(undefined)).toBeNull();
  });
});

describe("scoreColorClass", () => {
  it("returns red below 5", () => {
    expect(scoreColorClass(4)).toContain("red");
    expect(scoreColorClass(4.9)).toContain("red");
  });
  it("returns amber between 5 and 7 inclusive", () => {
    expect(scoreColorClass(5)).toContain("amber");
    expect(scoreColorClass(7)).toContain("amber");
  });
  it("returns green above 7", () => {
    expect(scoreColorClass(7.1)).toContain("green");
    expect(scoreColorClass(10)).toContain("green");
  });
});
