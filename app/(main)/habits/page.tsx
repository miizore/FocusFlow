import { Suspense } from "react";
import { connection } from "next/server";
import { getHabits, getHabitLogsForDates } from "@/app/actions/habits";
import { HabitsDashboard, type DayColumn } from "@/components/habits/habits-dashboard";

function formatDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const WEEKDAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getRecent7Days(): DayColumn[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = formatDayKey(today);

  const days: DayColumn[] = [];
  // 7 days ending today: today - 6 to today
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDayKey(d);
    days.push({
      date: dateStr,
      dayLabel: WEEKDAY_NAMES[d.getDay()],
      shortDate: `${d.getMonth() + 1}/${d.getDate()}`,
      isToday: dateStr === todayKey,
    });
  }
  return days;
}

function HabitsSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-black p-6 space-y-6">
      <div className="h-28 bg-zinc-950 border border-zinc-800 animate-pulse" />
      <div className="h-64 bg-zinc-950 border border-zinc-800 animate-pulse" />
    </div>
  );
}

async function HabitsContent() {
  await connection();
  const days = getRecent7Days();
  const dates = days.map((d) => d.date);

  const [habitsResult, logsResult] = await Promise.all([
    getHabits(),
    getHabitLogsForDates(dates),
  ]);

  if (!habitsResult.success) {
    return (
      <div className="border border-red-900 bg-red-950/60 p-4 font-mono text-xs text-red-400 m-6">
        DATA_LOAD_ERROR: {habitsResult.error ?? "UNKNOWN"}
      </div>
    );
  }

  const habits = habitsResult.data ?? [];
  const logs = logsResult.success ? (logsResult.data ?? []) : [];

  return <HabitsDashboard habits={habits} logs={logs} days={days} />;
}

export default function HabitsPage() {
  return (
    <Suspense fallback={<HabitsSkeleton />}>
      <HabitsContent />
    </Suspense>
  );
}
