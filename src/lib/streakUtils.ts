/**
 * Shared logic for streak and last-practiced label from session list.
 * Used by HomePage and Dashboard so values stay consistent.
 */

export type SessionWithDate = { created_at: string };

export function getStreakAndLastPracticed(sessions: SessionWithDate[]): {
  streak: number;
  lastPracticedLabel: string | null;
} {
  const today = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  if (sessions.length === 0) {
    return { streak: 0, lastPracticedLabel: null };
  }

  const lastSessionDate = (() => {
    const created = new Date(sessions[sessions.length - 1].created_at);
    created.setHours(0, 0, 0, 0);
    return created.getTime();
  })();

  const lastPracticedDaysAgo = Math.floor(
    (today - lastSessionDate) / (24 * 60 * 60 * 1000)
  );
  const lastPracticedLabel =
    lastPracticedDaysAgo === 0
      ? "Today"
      : lastPracticedDaysAgo === 1
        ? "Yesterday"
        : `${lastPracticedDaysAgo} days ago`;

  const dateSet = new Set(
    sessions.map((s) => {
      const d = new Date(s.created_at);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  let check = today;
  while (dateSet.has(check)) {
    streak++;
    check -= 24 * 60 * 60 * 1000;
  }

  return { streak, lastPracticedLabel };
}
