import { describe, expect, it } from "vitest";

import {
  EFFORT_DESCRIPTIONS_ZH,
  MODE_DESCRIPTIONS_ZH,
  SKIN_DESCRIPTION_ZH,
  TOOL_DESCRIPTION_ZH,
  buildToolDescription,
} from "../src/prompts";

describe("heart-window prompt policy", () => {
  const description = buildToolDescription();

  it("describes directly readable first-person narration", () => {
    expect(description).toContain("对方可以直接阅读");
    expect(description).toContain("第一人称");
    expect(description).toContain("心绪");
    expect(description).toContain("思路");
    expect(description).not.toContain("用户看不到");
    expect(description).not.toContain("private scratchpad");
  });

  it("encodes semantic triggers and the four-reply fallback", () => {
    expect(description).toContain("语义触发");
    expect(description).toContain("连续四条实质性回复");
    expect(description).toContain("下一条实质性回复必须");
    expect(description).toContain("每轮最多调用一次");
  });

  it("keeps relational narration separate from answer planning", () => {
    const relational = MODE_DESCRIPTIONS_ZH.relational;
    expect(relational).toContain("不要复述");
    expect(relational).toContain("不要解释接下来准备怎样回答");
    expect(relational).toContain("AI、模型、系统、提示词、工具");
    expect(relational).toContain("我想");
    expect(relational).toContain("我喜欢");
    expect(relational).toContain("我不同意");
    expect(relational).toContain("我担心");
  });

  it("keeps deep thinking focused on public key trade-offs", () => {
    expect(MODE_DESCRIPTIONS_ZH.deep_think).toContain("关键判断");
    expect(MODE_DESCRIPTIONS_ZH.deep_think).toContain("证据冲突");
    expect(MODE_DESCRIPTIONS_ZH.deep_think).toContain("取舍");
    expect(MODE_DESCRIPTIONS_ZH.deep_think).not.toContain("逐步转录");
  });

  it("states exact effort bands and approved defaults", () => {
    expect(EFFORT_DESCRIPTIONS_ZH.low).toContain("30–80");
    expect(EFFORT_DESCRIPTIONS_ZH.medium).toContain("80–180");
    expect(EFFORT_DESCRIPTIONS_ZH.high).toContain("180–350");
    expect(description).toContain("relational + low + paper");
  });

  it("names both understated skins", () => {
    const skins = Object.values(SKIN_DESCRIPTION_ZH).join(" ");
    expect(skins).toContain("paper");
    expect(skins).toContain("ink");
    expect(skins).toContain("灰粉");
    expect(skins).toContain("暗玫瑰");
  });

  it("exports the assembled description as a stable constant", () => {
    expect(TOOL_DESCRIPTION_ZH).toBe(description);
  });
});
