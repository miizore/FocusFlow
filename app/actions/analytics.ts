"use server";

import { db } from "@/db";
import { focusSessions, tasks } from "@/db/schema";
import { eq, gte } from "drizzle-orm";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type FocusTrendPoint = {
  date: string;
  label: string;
  minutes: number;
  seconds: number;
};

export type MonthDayStat = {
  date: string;
  day: number;
  completedTasks: number;
  inMonth: boolean;
};

export async function getFocusTrendLast14Days() {
  try {
    const today = startOfDay(new Date());
    const from = new Date(today);
    from.setDate(from.getDate() - 13);

    const sessions = await db
      .select({
        startedAt: focusSessions.startedAt,
        duration: focusSessions.duration,
      })
      .from(focusSessions)
      .where(gte(focusSessions.startedAt, from));

    const buckets = new Map<string, number>();
    for (let i = 0; i < 14; i += 1) {
      const day = new Date(from);
      day.setDate(from.getDate() + i);
      buckets.set(formatDayKey(day), 0);
    }

    for (const session of sessions) {
      const key = formatDayKey(new Date(session.startedAt));
      if (!buckets.has(key)) continue;
      buckets.set(key, (buckets.get(key) ?? 0) + session.duration);
    }

    const data: FocusTrendPoint[] = [...buckets.entries()].map(
      ([date, seconds]) => {
        const d = new Date(date + "T00:00:00");
        return {
          date,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          seconds,
          minutes: Math.round((seconds / 60) * 10) / 10,
        };
      }
    );

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMonthTaskCompletion(year: number, month: number) {
  try {
    // month: 0-indexed
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const doneTasks = await db
      .select({
        id: tasks.id,
        plannedDate: tasks.plannedDate,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(eq(tasks.status, "done"));

    const monthStartKey = formatDayKey(monthStart);
    const monthEndKey = formatDayKey(monthEnd);
    const counts = new Map<string, number>();
    let totalCompleted = 0;

    for (const task of doneTasks) {
      const key = task.plannedDate
        ? task.plannedDate
        : formatDayKey(new Date(task.createdAt));
      if (key < monthStartKey || key > monthEndKey) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      totalCompleted += 1;
    }

    const firstWeekday = monthStart.getDay(); // 0 Sun
    const daysInMonth = monthEnd.getDate();
    const cells: MonthDayStat[] = [];

    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({
        date: "",
        day: 0,
        completedTasks: 0,
        inMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = formatDayKey(new Date(year, month, day));
      cells.push({
        date,
        day,
        completedTasks: counts.get(date) ?? 0,
        inMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        date: "",
        day: 0,
        completedTasks: 0,
        inMonth: false,
      });
    }

    return {
      success: true,
      data: {
        year,
        month,
        label: `${year}年${month + 1}月`,
        cells,
        totalCompleted,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
