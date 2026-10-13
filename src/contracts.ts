import { z } from "zod";

export type Mode = "relational" | "deep_think";
export type Effort = "low" | "medium" | "high";
export type Skin = "paper" | "ink";

export interface RenderInput {
  content: string;
  mode?: Mode;
  effort?: Effort;
  skin?: Skin | "botanical" | "microglow";
}

export interface RenderViewModel {
  content: string;
  mode: Mode;
  effort: Effort;
  skin: Skin;
  expanded: boolean;
}

export const EFFORT_LIMITS: Readonly<Record<Effort, number>> = Object.freeze({
  low: 80,
  medium: 180,
  high: 350,
});

export const renderInputSchema = z.object({
  content: z.string().trim().min(1),
  mode: z.enum(["relational", "deep_think"]).optional(),
  effort: z.enum(["low", "medium", "high"]).optional(),
  skin: z.enum(["paper", "ink", "botanical", "microglow"]).optional(),
});

const skinAliases: Record<NonNullable<RenderInput["skin"]>, Skin> = {
  paper: "paper",
  ink: "ink",
  botanical: "paper",
  microglow: "ink",
};

export function truncateAtSentence(text: string, limit: number): string {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("limit must be a positive integer");
  }

  const characters = Array.from(text);
  if (characters.length <= limit) {
    return text;
  }

  const candidate = characters.slice(0, limit);
  for (let index = candidate.length - 1; index >= 0; index -= 1) {
    if (/[。！？!?…]/u.test(candidate[index])) {
      return candidate.slice(0, index + 1).join("");
    }
  }

  if (limit === 1) {
    return "…";
  }
  return `${characters.slice(0, limit - 1).join("")}…`;
}

export function normalizeRenderInput(raw: unknown): RenderViewModel {
  const parsed = renderInputSchema.parse(raw);
  const mode = parsed.mode ?? "relational";
  const effort = parsed.effort ?? "low";
  const skin = skinAliases[parsed.skin ?? "paper"];

  return {
    content: truncateAtSentence(parsed.content, EFFORT_LIMITS[effort]),
    mode,
    effort,
    skin,
    expanded: effort === "low",
  };
}
