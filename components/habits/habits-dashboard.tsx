"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import type { Habit, HabitLog } from "@/db/schema";
import { createHabit, deleteHabit, toggleHabitLog } from "@/app/actions/habits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DayColumn = {
  date: string;
  dayLabel: string;
  shortDate: string;
  isToday: boolean;
};

export function HabitsDashboard({
  habits,
  logs,
  days,
}: {
  habits: Habit[];
  logs: HabitLog[];
  days: DayColumn[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newHabitName, setNewHabitName] = useState("");
  const [optimisticLogs, setOptimisticLogs] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const log of logs) {
      map[`${log.habitId}:${log.date}`] = log.completed;
    }
    return map;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    startTransition(async () => {
      const res = await createHabit(newHabitName.trim());
      if (!res.success) {
        toast.error(res.error ?? "创建习惯失败");
      } else {
        toast.success("习惯已创建");
        setNewHabitName("");
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`确认删除习惯 "${name}"？`)) return;
    startTransition(async () => {
      const res = await deleteHabit(id);
      if (!res.success) {
        toast.error(res.error ?? "删除失败");
      } else {
        toast.success("习惯已删除");
        router.refresh();
      }
    });
  };

  const handleToggle = (habitId: string, date: string) => {
    const key = `${habitId}:${date}`;
    const current = Boolean(optimisticLogs[key]);
    const next = !current;
    setOptimisticLogs((prev) => ({ ...prev, [key]: next }));

    startTransition(async () => {
      const res = await toggleHabitLog(habitId, date, next);
      if (!res.success) {
        setOptimisticLogs((prev) => ({ ...prev, [key]: current }));
        toast.error(res.error ?? "更新打卡失败");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-black p-6 select-text text-zinc-100">
      <div className="border border-zinc-800 bg-black p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
          <div>
            <h1 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
              HABITS MATRIX // 7-DAY TRACKER
            </h1>
            <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
              高密度 7 天习惯养成矩阵 · 实时同步服务端日志
            </p>
          </div>
          <span className="font-mono text-[10px] text-zinc-600">
            ACTIVE HABITS: {habits.length}
          </span>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2 pt-3">
          <Input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="输入新习惯名称 (如：每日阅读 30 分钟 / 晨跑)..."
            className="flex-1"
            disabled={pending}
          />
          <Button type="submit" disabled={pending || !newHabitName.trim()} className="shrink-0">
            <Plus className="size-3.5" />
            <span>ADD_HABIT</span>
          </Button>
        </form>
      </div>

      <div className="border border-zinc-800 bg-black overflow-x-auto">
        <table className="w-full border-collapse text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/80 text-zinc-400">
              <th className="p-3 font-semibold uppercase tracking-wider min-w-[200px]">HABIT_NAME</th>
              {days.map((d) => (
                <th
                  key={d.date}
                  className={cn(
                    "p-3 text-center border-l border-zinc-800 font-semibold uppercase tracking-wider min-w-[72px]",
                    d.isToday && "bg-[#002FA7]/15 text-white"
                  )}
                >
                  <div className="text-[11px]">{d.dayLabel}</div>
                  <div className={cn("text-[9px] font-normal", d.isToday ? "text-blue-400 font-bold" : "text-zinc-600")}>
                    {d.shortDate}
                  </div>
                </th>
              ))}
              <th className="p-3 text-center border-l border-zinc-800 w-16">DEL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {habits.length === 0 ? (
              <tr>
                <td colSpan={days.length + 2} className="p-8 text-center text-zinc-600 font-mono text-xs">
                  暂无习惯，请在上方输入框中新建习惯
                </td>
              </tr>
            ) : (
              habits.map((habit) => {
                const completedCount = days.filter((d) => optimisticLogs[`${habit.id}:${d.date}`]).length;
                return (
                  <tr key={habit.id} className="hover:bg-zinc-950/50 transition-colors group">
                    <td className="p-3 text-zinc-200">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{habit.name}</span>
                        <span className="text-[10px] text-zinc-600 font-mono">
                          {completedCount}/{days.length}
                        </span>
                      </div>
                    </td>
                    {days.map((d) => {
                      const isDone = Boolean(optimisticLogs[`${habit.id}:${d.date}`]);
                      return (
                        <td
                          key={d.date}
                          className={cn("p-2 text-center border-l border-zinc-900", d.isToday && "bg-[#002FA7]/5")}
                        >
                          <button
                            type="button"
                            onClick={() => handleToggle(habit.id, d.date)}
                            disabled={pending}
                            title={`${habit.name} - ${d.date} (${isDone ? "已完成" : "未完成"})`}
                            className={cn(
                              "mx-auto flex size-7 items-center justify-center border transition-colors cursor-pointer",
                              isDone
                                ? "border-[#002FA7] bg-[#002FA7] text-white"
                                : "border-zinc-800 bg-black text-transparent hover:border-zinc-600 hover:text-zinc-700"
                            )}
                          >
                            <Check className={cn("size-3.5", !isDone && "opacity-0")} />
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center border-l border-zinc-900">
                      <button
                        type="button"
                        onClick={() => handleDelete(habit.id, habit.name)}
                        disabled={pending}
                        title="删除习惯"
                        className="p-1 text-zinc-600 hover:text-[#BC0C0C] transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
