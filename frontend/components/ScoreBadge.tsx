"use client";

import { parseScore, scoreColorClass } from "@/lib/score";

interface Props {
  value: string | number | null;
}

export function ScoreBadge({ value }: Props) {
  const score = parseScore(value);
  const display = score === null ? "—" : score.toFixed(1);
  return (
    <span
      className={`inline-flex min-w-[3rem] justify-center rounded-md border px-2 py-1 text-sm font-semibold ${scoreColorClass(score)}`}
    >
      {display}
    </span>
  );
}
