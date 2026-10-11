"use server";

import { db } from "@/db";
import { focusSessions } from "@/db/schema";
import { gte, sql } from "drizzle-orm";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type ProAnalyticsData = {
  // Top KPI Metrics
  todayDurationMinutes: number;
  todaySessionCount: number;
  yesterdayDurationMinutes: number;
  yesterdaySessionCount: number;
  durationDiffMinutes: number; // today - yesterday
  sessionDiffCount: number; // today - yesterday

  // Chart 1: 14-day total focus minutes trend
  trend14Days: {
    date: string;
    label: string;
    minutes: number;
    seconds: number;
  }[];

  // Chart 2: Hourly distribution (00:00 - 23:00)
  hourlyDistribution: {
    hour: number;
    hourLabel: string;
    count: number;
    totalMinutes: number;
  }[];

  // Chart 3: Annual Heatmap (Last 365 days / past 52-53 weeks)
  heatmapDays: {
    date: string;
    minutes: number;
    level: 0 | 1 | 2 | 3 | 4;
  }[];
  totalPastYearMinutes: number;
};

export async function getProAnalytics(): Promise<{
  success: boolean;
  data?: ProAnalyticsData;
  error?: string;
}> {
  try {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 365 days ago
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 364);

    // Single query for sessions in the past year to compute all aggregations in Server Action
    const sessions = await db
      .select({
        startedAt: focusSessions.startedAt,
        duration: focusSessions.duration,
      })
      .from(focusSessions)
      .where(gte(focusSessions.startedAt, oneYearAgo));

    const todayKey = formatDayKey(today);
    const yesterdayKey = formatDayKey(yesterday);

    let todaySeconds = 0;
    let todayCount = 0;
    let yesterdaySeconds = 0;
    let yesterdayCount = 0;

    // 14-day buckets
    const trendBuckets = new Map<string, number>();
    const from14Days = new Date(today);
    from14Days.setDate(from14Days.getDate() - 13);
    for (let i = 0; i < 14; i++) {
      const d = new Date(from14Days);
      d.setDate(from14Days.getDate() + i);
      trendBuckets.set(formatDayKey(d), 0);
    }

    // Hourly buckets (0 - 23)
    const hourlyCounts = new Array(24).fill(0);
    const hourlySeconds = new Array(24).fill(0);

    // Heatmap buckets (365 days)
    const heatmapBuckets = new Map<string, number>();
    for (let i = 0; i < 365; i++) {
      const d = new Date(oneYearAgo);
      d.setDate(oneYearAgo.getDate() + i);
      heatmapBuckets.set(formatDayKey(d), 0);
    }

    let totalPastYearSeconds = 0;

    for (const session of sessions) {
      const start = new Date(session.startedAt);
      const dayKey = formatDayKey(start);
      const hour = start.getHours();
      const dur = session.duration;

      totalPastYearSeconds += dur;

      // Today / Yesterday
      if (dayKey === todayKey) {
        todaySeconds += dur;
        todayCount += 1;
      } else if (dayKey === yesterdayKey) {
        yesterdaySeconds += dur;
        yesterdayCount += 1;
      }

      // 14 days
      if (trendBuckets.has(dayKey)) {
        trendBuckets.set(dayKey, (trendBuckets.get(dayKey) ?? 0) + dur);
      }

      // Hourly (using local hour)
      if (hour >= 0 && hour < 24) {
        hourlyCounts[hour] += 1;
        hourlySeconds[hour] += dur;
      }

      // Heatmap
      if (heatmapBuckets.has(dayKey)) {
        heatmapBuckets.set(dayKey, (heatmapBuckets.get(dayKey) ?? 0) + dur);
      }
    }

    const todayDurationMinutes = Math.round(todaySeconds / 60);
    const yesterdayDurationMinutes = Math.round(yesterdaySeconds / 60);

    const trend14Days = [...trendBuckets.entries()].map(([date, seconds]) => {
      const d = new Date(date + "T00:00:00");
      return {
        date,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        seconds,
        minutes: Math.round((seconds / 60) * 10) / 10,
      };
    });

    const hourlyDistribution = Array.from({ length: 24 }, (_, h) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return {
        hour: h,
        hourLabel: `${pad(h)}:00`,
        count: hourlyCounts[h],
        totalMinutes: Math.round(hourlySeconds[h] / 60),
      };
    });

    const heatmapDays = [...heatmapBuckets.entries()].map(([date, seconds]) => {
      const minutes = Math.round(seconds / 60);
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (minutes >= 120) level = 4;
      else if (minutes >= 60) level = 3;
      else if (minutes >= 30) level = 2;
      else if (minutes > 0) level = 1;

      return {
        date,
        minutes,
        level,
      };
    });

    return {
      success: true,
      data: {
        todayDurationMinutes,
        todaySessionCount: todayCount,
        yesterdayDurationMinutes,
        yesterdaySessionCount: yesterdayCount,
        durationDiffMinutes: todayDurationMinutes - yesterdayDurationMinutes,
        sessionDiffCount: todayCount - yesterdayCount,
        trend14Days,
        hourlyDistribution,
        heatmapDays,
        totalPastYearMinutes: Math.round(totalPastYearSeconds / 60),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
