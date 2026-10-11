/** Shared focus business rules (client + server safe). */

export const MIN_FOCUS_SECONDS = 300;
export const MAX_FOCUS_SECONDS = 14400;

export type TimeRange = {
  startedAt: Date | string | number;
  endedAt: Date | string | number;
};

export type TimedSessionEvaluation =
  | { ok: false; rejected: true; reason: string }
  | {
      ok: true;
      rejected: false;
      duration: number;
      truncated: boolean;
      endedAt: Date;
    };

export function toTimestamp(value: Date | string | number): number {
  return new Date(value).getTime();
}

export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aStart = toTimestamp(a.startedAt);
  const aEnd = toTimestamp(a.endedAt);
  const bStart = toTimestamp(b.startedAt);
  const bEnd = toTimestamp(b.endedAt);
  return aStart < bEnd && aEnd > bStart;
}

export function findOverlappingSession<T extends TimeRange>(
  candidate: TimeRange,
  existing: T[]
): T | undefined {
  return existing.find((session) => rangesOverlap(candidate, session));
}

/** Apply fragment filter + ghost truncation to a timed session window. */
export function evaluateTimedSession(
  startedAt: Date | string | number,
  endedAt: Date | string | number
): TimedSessionEvaluation {
  const started = new Date(startedAt);
  const ended = new Date(endedAt);
  let duration = Math.floor((ended.getTime() - started.getTime()) / 1000);

  if (duration < MIN_FOCUS_SECONDS) {
    return {
      ok: false,
      rejected: true,
      reason: "时间过短，视为碎片时间丢弃 (< 300秒)",
    };
  }

  let truncated = false;
  if (duration > MAX_FOCUS_SECONDS) {
    duration = MAX_FOCUS_SECONDS;
    ended.setTime(started.getTime() + MAX_FOCUS_SECONDS * 1000);
    truncated = true;
  }

  return {
    ok: true,
    rejected: false,
    duration,
    truncated,
    endedAt: ended,
  };
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
