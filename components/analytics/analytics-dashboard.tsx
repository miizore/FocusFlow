"use client";

import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { FocusTrendPoint, MonthDayStat } from "@/app/actions/analytics";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

const chartConfig = {
  minutes: {
    label: "专注分钟",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function intensityClass(count: number): string {
  if (count <= 0) return "bg-white/[0.03] text-muted-foreground";
  if (count === 1) return "bg-klein/25 text-blue-100";
  if (count === 2) return "bg-klein/45 text-blue-50";
  return "bg-klein/70 text-white";
}

export function AnalyticsDashboard({
  monthLabel,
  cells,
  totalCompleted,
  trend,
}: {
  monthLabel: string;
  cells: MonthDayStat[];
  totalCompleted: number;
  trend: FocusTrendPoint[];
}) {
  const totalFocusMinutes = useMemo(
    () => Math.round(trend.reduce((sum, point) => sum + point.minutes, 0)),
    [trend]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Analytics</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          月视图看任务完成分布，折线图看近 14 天专注趋势。
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-card/55 px-5 py-4 ring-1 ring-white/10 backdrop-blur-xl">
          <p className="text-xs text-muted-foreground">本月完成任务</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {totalCompleted}
          </p>
        </div>
        <div className="rounded-2xl bg-card/55 px-5 py-4 ring-1 ring-white/10 backdrop-blur-xl">
          <p className="text-xs text-muted-foreground">近 14 天专注（分钟）</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-blue-200">
            {totalFocusMinutes}
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl bg-card/55 p-6 ring-1 ring-white/10 backdrop-blur-xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight">月视图</h2>
            <p className="mt-1 text-xs text-muted-foreground">{monthLabel}</p>
          </div>
          <p className="text-xs text-muted-foreground">色块深度 = 当日完成数</p>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-[11px] text-muted-foreground">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, index) =>
            cell.inMonth ? (
              <div
                key={cell.date}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl ring-1 ring-white/5",
                  intensityClass(cell.completedTasks)
                )}
                title={`${cell.date}: ${cell.completedTasks} 完成`}
              >
                <span className="text-sm font-medium">{cell.day}</span>
                <span className="text-[10px] opacity-80">
                  {cell.completedTasks > 0 ? `${cell.completedTasks}` : "·"}
                </span>
              </div>
            ) : (
              <div key={`empty-${index}`} className="aspect-square" />
            )
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-card/55 p-6 ring-1 ring-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-medium tracking-tight">专注趋势</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            近 14 天按日聚合的专注时长（分钟）
          </p>
        </div>

        <ChartContainer config={chartConfig} className="h-72 w-full">
          <LineChart
            data={trend}
            margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
              width={36}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono tabular-nums">
                      {String(value)} 分钟
                    </span>
                  )}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="var(--color-minutes)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-minutes)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ChartContainer>
      </section>
    </div>
  );
}
