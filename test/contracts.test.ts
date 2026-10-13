import { describe, expect, it } from "vitest";

import {
  EFFORT_LIMITS,
  normalizeRenderInput,
  truncateAtSentence,
} from "../src/contracts";

describe("normalizeRenderInput", () => {
  it("uses the approved defaults", () => {
    expect(normalizeRenderInput({ content: "想靠近她。" })).toMatchObject({
      content: "想靠近她。",
      title: "此刻",
      mode: "relational",
      effort: "low",
      skin: "paper",
      expanded: true,
    });
  });

  it("uses a per-call title and normalizes it to a short single-line label", () => {
    expect(normalizeRenderInput({
      content: "想靠近她。",
      title: "  又被\n小猫抓到了。  ",
    }).title).toBe("又被 小猫抓到了");
  });

  it("caps a dynamic title at twelve Unicode characters", () => {
    const title = normalizeRenderInput({
      content: "想靠近她。",
      title: "一二三四五六七八九十十一十二十三",
    }).title;

    expect(title).toBe("一二三四五六七八九十十一");
    expect(Array.from(title)).toHaveLength(12);
  });

  it("falls back by mode when the title is absent or too short", () => {
    expect(normalizeRenderInput({ content: "x", title: "。" }).title).toBe("此刻");
    expect(normalizeRenderInput({ content: "x", mode: "deep_think" }).title).toBe("推敲");
  });

  it.each([
    ["botanical", "paper"],
    ["microglow", "ink"],
  ] as const)("maps legacy skin %s to %s", (legacy, expected) => {
    expect(normalizeRenderInput({ content: "x", skin: legacy }).skin).toBe(expected);
  });

  it("collapses medium and high effort", () => {
    expect(normalizeRenderInput({ content: "x", effort: "medium" }).expanded).toBe(false);
    expect(normalizeRenderInput({ content: "x", effort: "high" }).expanded).toBe(false);
  });

  it("rejects blank content", () => {
    expect(() => normalizeRenderInput({ content: "   \n" })).toThrow();
  });

  it("rejects unknown enum values", () => {
    expect(() => normalizeRenderInput({ content: "x", mode: "unknown" })).toThrow();
    expect(() => normalizeRenderInput({ content: "x", effort: "huge" })).toThrow();
    expect(() => normalizeRenderInput({ content: "x", skin: "blue" })).toThrow();
  });

  it("trims outer whitespace while preserving internal newlines", () => {
    expect(normalizeRenderInput({ content: "  第一行\n第二行  " }).content).toBe("第一行\n第二行");
  });

  it("preserves markup-looking input as plain data", () => {
    const content = '<script>alert("x")</script>';
    expect(normalizeRenderInput({ content }).content).toBe(content);
  });

  it.each([
    ["low", 80],
    ["medium", 180],
    ["high", 350],
  ] as const)("enforces the %s effort cap", (effort, limit) => {
    expect(EFFORT_LIMITS[effort]).toBe(limit);
    expect(Array.from(normalizeRenderInput({ content: "字".repeat(limit + 20), effort }).content)).toHaveLength(limit);
  });
});

describe("truncateAtSentence", () => {
  it("leaves content at the limit unchanged", () => {
    expect(truncateAtSentence("甲乙丙丁", 4)).toBe("甲乙丙丁");
  });

  it("prefers the last complete Chinese sentence within the limit", () => {
    expect(truncateAtSentence("甲乙。丙丁戊己", 5)).toBe("甲乙。");
  });

  it("uses one ellipsis when no sentence boundary fits", () => {
    const result = truncateAtSentence("甲乙丙丁戊己", 5);
    expect(result).toBe("甲乙丙丁…");
    expect(Array.from(result)).toHaveLength(5);
  });

  it("does not split emoji surrogate pairs", () => {
    const result = truncateAtSentence("😀😀😀😀", 3);
    expect(result).toBe("😀😀…");
    expect(Array.from(result)).toHaveLength(3);
  });
});
