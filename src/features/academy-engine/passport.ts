import { RUBRIC_CRITERIA, SUFFICIENT, type Rubric } from "./types";

export interface Attempt {
  created_at: string;
  with_support: boolean;
  new_situation: boolean;
  rubric: Partial<Rubric>;
}

export type SkillStatus = "none" | "supported" | "independent" | "transfer";

const rubricComplete = (r: Partial<Rubric>) => RUBRIC_CRITERIA.every((c) => typeof r[c] === "number");
const allSufficient = (r: Partial<Rubric>) => RUBRIC_CRITERIA.every((c) => (r[c] ?? 0) >= SUFFICIENT);
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * Section 11 of the school plan:
 * - «З опорою»: task done at least once, assessed by the rubric.
 * - «Самостійно»: ≥2 independent (no supports) attempts on different days, every criterion ≥ «достатньо».
 * - «У новій ситуації»: an attempt in a changed scenario, without supports, every criterion ≥ «достатньо».
 */
export function computeStatus(attempts: Attempt[]): SkillStatus {
  const rated = attempts.filter((a) => rubricComplete(a.rubric));
  if (rated.length === 0) return "none";
  const goodSolo = rated.filter((a) => !a.with_support && allSufficient(a.rubric));
  if (goodSolo.some((a) => a.new_situation)) return "transfer";
  const days = new Set(goodSolo.filter((a) => !a.new_situation).map((a) => dayKey(a.created_at)));
  if (days.size >= 2) return "independent";
  return "supported";
}
