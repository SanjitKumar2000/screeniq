/**
 * Score utilities. Backend already normalizes to a number string (DRF Decimal),
 * but we keep a frontend parser as a backstop for two reasons:
 *   1. Manual data entry / fixtures may not go through backend normalization.
 *   2. Streaming token-by-token (C-1) shows partial output BEFORE the final
 *      `done` event delivers the canonical parsed score; we want to display
 *      something reasonable in the meantime.
 *
 * Single source of truth remains the backend. See README → "B-3 trade-off".
 */

const WORD_TO_NUM: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

export function parseScore(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return clamp(raw);
  const text = raw.trim().toLowerCase();
  if (!text) return null;

  for (const [word, num] of Object.entries(WORD_TO_NUM)) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return num;
  }
  const frac = text.match(/(\d+(?:\.\d+)?)\s*(?:\/|out\s+of)\s*10/);
  if (frac) return clamp(parseFloat(frac[1]));
  const num = text.match(/(\d+(?:\.\d+)?)/);
  if (num) return clamp(parseFloat(num[1]));
  return null;
}

function clamp(n: number): number {
  if (n < 1) return 1;
  if (n > 10) return 10;
  return n;
}

/** Tailwind classes for the colour-coded badge. Spec: red <5, amber 5-7, green >7. */
export function scoreColorClass(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-600";
  if (score < 5) return "bg-red-100 text-red-800 border-red-300";
  if (score <= 7) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-green-100 text-green-800 border-green-300";
}
