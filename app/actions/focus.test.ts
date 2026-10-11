import { describe, expect, it } from "vitest";
import {
  evaluateTimedSession,
  findOverlappingSession,
  MAX_FOCUS_SECONDS,
  MIN_FOCUS_SECONDS,
  rangesOverlap,
} from "@/lib/focus-rules";

describe("focus fragment filter (< 300s)", () => {
  it("rejects sessions shorter than 5 minutes", () => {
    const started = new Date("2026-10-11T10:00:00.000Z");
    const ended = new Date(started.getTime() + (MIN_FOCUS_SECONDS - 1) * 1000);
    const result = evaluateTimedSession(started, ended);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.rejected).toBe(true);
      expect(result.reason).toContain("碎片时间");
    }
  });

  it("accepts sessions of exactly 5 minutes", () => {
    const started = new Date("2026-10-11T10:00:00.000Z");
    const ended = new Date(started.getTime() + MIN_FOCUS_SECONDS * 1000);
    const result = evaluateTimedSession(started, ended);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.duration).toBe(MIN_FOCUS_SECONDS);
      expect(result.truncated).toBe(false);
    }
  });
});

describe("focus ghost truncation (> 4h)", () => {
  it("truncates sessions longer than 4 hours", () => {
    const started = new Date("2026-10-11T08:00:00.000Z");
    const ended = new Date(started.getTime() + (MAX_FOCUS_SECONDS + 600) * 1000);
    const result = evaluateTimedSession(started, ended);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.truncated).toBe(true);
      expect(result.duration).toBe(MAX_FOCUS_SECONDS);
      expect(result.endedAt.getTime()).toBe(
        started.getTime() + MAX_FOCUS_SECONDS * 1000
      );
    }
  });
});

describe("focus collision detection", () => {
  const existing = [
    {
      startedAt: "2026-10-11T09:00:00.000Z",
      endedAt: "2026-10-11T10:00:00.000Z",
    },
  ];

  it("detects overlapping ranges", () => {
    expect(
      rangesOverlap(
        {
          startedAt: "2026-10-11T09:30:00.000Z",
          endedAt: "2026-10-11T10:30:00.000Z",
        },
        existing[0]
      )
    ).toBe(true);
  });

  it("allows adjacent non-overlapping ranges", () => {
    const candidate = {
      startedAt: "2026-10-11T10:00:00.000Z",
      endedAt: "2026-10-11T11:00:00.000Z",
    };
    expect(findOverlappingSession(candidate, existing)).toBeUndefined();
  });

  it("flags contained overlaps", () => {
    const candidate = {
      startedAt: "2026-10-11T09:15:00.000Z",
      endedAt: "2026-10-11T09:45:00.000Z",
    };
    expect(findOverlappingSession(candidate, existing)).toEqual(existing[0]);
  });
});
