/** Normalises German input: case, spacing, edge punctuation, ä=ae, ö=oe, ü=ue, ß=ss. */
export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[„“”"'’]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.,!?;:]+|[.,!?;:]+$/g, "")
    .trim();
}

export function isAccepted(input: string, valid: string[]): boolean {
  const n = normalizeAnswer(input);
  if (!n) return false;
  return valid.some((v) => normalizeAnswer(v) === n);
}

export function sameSet(a: number[], b: number[]): boolean {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}
