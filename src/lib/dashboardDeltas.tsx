import type { SessionRow } from "../types/session";

export type DeltaDirection = "up" | "down" | "same" | null;

export function computeRollingDelta(
  rows: SessionRow[],
  valueGetter: (s: SessionRow) => number | null,
  windowSize = 5,
): { delta: number | null; direction: DeltaDirection } {
  const valid = rows.filter((s) => valueGetter(s) != null);
  if (valid.length < windowSize + 1) return { delta: null, direction: null };
  const recent = valid.slice(-windowSize);
  const before = valid.slice(-windowSize * 2, -windowSize);
  if (before.length === 0) return { delta: null, direction: null };
  const avg = (arr: SessionRow[]) => {
    const vals = arr.map(valueGetter).filter((v): v is number => v != null);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  const r = avg(recent);
  const b = avg(before);
  const diff = Math.round(r - b);
  return { delta: diff, direction: diff > 1 ? "up" : diff < -1 ? "down" : "same" };
}

export function StatDelta({
  delta,
  direction,
  invertGood = false,
  unit = "",
}: {
  delta: number | null;
  direction: DeltaDirection;
  invertGood?: boolean;
  unit?: string;
}) {
  if (delta == null || direction === "same" || direction == null) return null;
  const isGood = invertGood ? direction === "down" : direction === "up";
  const arrow = direction === "up" ? "↑" : "↓";
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={`text-xs font-semibold ${isGood ? "text-emerald-600" : "text-red-500"}`}>
      {arrow} {sign}
      {delta}
      {unit}
    </span>
  );
}
