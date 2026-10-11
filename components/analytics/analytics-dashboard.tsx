"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDown, ArrowUp, BarChart2, Flame, LineChart as LineChartIcon, Minus, Timer } from "lucide-react";
import type { ProAnalyticsData } from "@/app/actions/analytics";
import { cn } from "@/lib/utils";

function HeatmapIntensityClass(level: 0 | 1 | 2 | 3 | 4): string {
  switch (level) {
    case 1:
      return "bg-[#002FA7]/40 border-[#002FA7]/50";
    case 2:
      return "bg-[#002FA7]/70 border-[#002FA7]/80";
    case 3:
      return "bg-[#002FA7] border-blue-500";
    case 4:
      return "bg-blue-500 border-white font-bold";
    default:
      return "bg-zinc-950 border-zinc-900";
  }
}

export function AnalyticsDashboard({
  data,
}: {
  data: ProAnalyticsData;
}) {
  const {
    todayDurationMinutes,
    todaySessionCount,
    durationDiffMinutes,
    sessionDiffCount,
    trend14Days,
    hourlyDistribution,
    heatmapDays,
    totalPastYearMinutes,
  } = data;

  // Group heatmap into 7 rows (days of week: Sun-Sat)
  const heatmapWeeks = useMemo(() => {
    const weeks: (typeof heatmapDays[0] | null)[][] = [];
    if (heatmapDays.length === 0) return weeks;

    let currentWeek: (typeof heatmapDays[0] | null)[] = [];
    const firstDayDate = new Date(heatmapDays[0].date + "T00:00:00");
    const firstWeekday = firstDayDate.getDay();

    // Fill leading empty cells for week 0
    for (let i = 0; i < firstWeekday; i++) {
      currentWeek.push(null);
    }

    for (const item of heatmapDays) {
      currentWeek.push(item);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [heatmapDays]);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-black p-6 select-text text-zinc-100 space-y-6">
      {/* Top Bar: Today's Metrics vs Yesterday */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Metric 1: Today Duration */}
        <div className="border border-zinc-800 bg-black p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Timer className="size-3.5 text-[#002FA7]" /> TODAY FOCUS TIME // 今日专注时长
            </span>
            <span className="font-mono text-[10px] text-zinc-600">AGGREGATED</span>
          </div>

          <div className="flex items-baseline justify-between pt-3">
            <div className="font-mono text-4xl md:text-5xl font-bold text-white tabular-nums">
              {todayDurationMinutes}{" "}
              <span className="text-xs font-normal text-zinc-500">MINS</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-1 font-mono text-xs px-2 py-1 border shrink-0",
                durationDiffMinutes > 0
                  ? "border-[#002FA7] bg-[#002FA7]/15 text-blue-400"
                  : durationDiffMinutes < 0
                  ? "border-zinc-800 bg-zinc-950 text-zinc-400"
                  : "border-zinc-800 bg-zinc-950 text-zinc-500"
              )}
            >
              {durationDiffMinutes > 0 ? (
                <>
                  <ArrowUp className="size-3 text-blue-400" />
                  <span>+{durationDiffMinutes}m VS 昨天</span>
                </>
              ) : durationDiffMinutes < 0 ? (
                <>
                  <ArrowDown className="size-3 text-zinc-400" />
                  <span>{durationDiffMinutes}m VS 昨天</span>
                </>
              ) : (
                <>
                  <Minus className="size-3 text-zinc-500" />
                  <span>持平昨日</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Metric 2: Today Sessions */}
        <div className="border border-zinc-800 bg-black p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Flame className="size-3.5 text-[#002FA7]" /> TODAY SESSIONS // 今日专注频次
            </span>
            <span className="font-mono text-[10px] text-zinc-600">COMPLETED</span>
          </div>

          <div className="flex items-baseline justify-between pt-3">
            <div className="font-mono text-4xl md:text-5xl font-bold text-white tabular-nums">
              {todaySessionCount}{" "}
              <span className="text-xs font-normal text-zinc-500">SESSIONS</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-1 font-mono text-xs px-2 py-1 border shrink-0",
                sessionDiffCount > 0
                  ? "border-[#002FA7] bg-[#002FA7]/15 text-blue-400"
                  : sessionDiffCount < 0
                  ? "border-zinc-800 bg-zinc-950 text-zinc-400"
                  : "border-zinc-800 bg-zinc-950 text-zinc-500"
              )}
            >
              {sessionDiffCount > 0 ? (
                <>
                  <ArrowUp className="size-3 text-blue-400" />
                  <span>+{sessionDiffCount} 次 VS 昨天</span>
                </>
              ) : sessionDiffCount < 0 ? (
                <>
                  <ArrowDown className="size-3 text-zinc-400" />
                  <span>{sessionDiffCount} 次 VS 昨天</span>
                </>
              ) : (
                <>
                  <Minus className="size-3 text-zinc-500" />
                  <span>持平昨日</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid: 14-Day Line + Hourly Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: 14-day Trend */}
        <section className="border border-zinc-800 bg-black p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div>
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <LineChartIcon className="size-3.5 text-[#002FA7]" /> 14-DAY FOCUS TREND // 专注趋势
              </h2>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                每日总专注时长走势（分钟）
              </p>
            </div>
            <span className="font-mono text-[10px] text-blue-400 border border-blue-900/50 bg-[#002FA7]/10 px-1.5 py-0.5">
              LINE CHART
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend14Days} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickMargin={8}
                  fontSize={10}
                  fontFamily="monospace"
                  stroke="#71717a"
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickMargin={8}
                  fontSize={10}
                  fontFamily="monospace"
                  stroke="#71717a"
                  width={36}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="border border-zinc-800 bg-black px-2.5 py-1.5 font-mono text-xs shadow-none">
                          <p className="text-zinc-500 text-[10px]">{item.date}</p>
                          <p className="text-white font-bold">{item.minutes} MINS</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  stroke="#002FA7"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "#002FA7", strokeWidth: 0 }}
                  activeDot={{ r: 4.5, fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 2: Hourly Distribution */}
        <section className="border border-zinc-800 bg-black p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
            <div>
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
                <BarChart2 className="size-3.5 text-[#002FA7]" /> PEAK PRODUCTIVITY HOURS // 最佳专注时段
              </h2>
              <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
                24 小时全天候专注频次分布 (00:00 - 23:00)
              </p>
            </div>
            <span className="font-mono text-[10px] text-blue-400 border border-blue-900/50 bg-[#002FA7]/10 px-1.5 py-0.5">
              BAR CHART
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistribution} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#27272a" />
                <XAxis
                  dataKey="hourLabel"
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickMargin={8}
                  fontSize={9}
                  fontFamily="monospace"
                  stroke="#71717a"
                  interval={2}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: "#27272a" }}
                  tickMargin={8}
                  fontSize={10}
                  fontFamily="monospace"
                  stroke="#71717a"
                  width={30}
                  allowDecimals={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="border border-zinc-800 bg-black px-2.5 py-1.5 font-mono text-xs shadow-none">
                          <p className="text-zinc-500 text-[10px]">{item.hourLabel} 窗口</p>
                          <p className="text-white font-bold">{item.count} 次专注</p>
                          <p className="text-blue-400 text-[10px]">{item.totalMinutes} 分钟累计</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="count" fill="#002FA7" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Chart 3: Annual Heatmap (Pure CSS Grid) */}
      <section className="border border-zinc-800 bg-black p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white flex items-center gap-1.5">
              <span className="size-2 bg-[#002FA7]" /> ANNUAL CONTRIBUTION HEATMAP // 年度专注热力图
            </h2>
            <p className="font-mono text-[10px] text-zinc-500 mt-0.5">
              近 365 天每日专注强度网格 (纯 CSS Grid 手工构建)
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px] text-zinc-500">
            <span>PAST YEAR: <strong className="text-white">{totalPastYearMinutes}</strong> MINS</span>
            <div className="flex items-center gap-1">
              <span>LESS</span>
              <span className="size-2.5 bg-zinc-950 border border-zinc-900" />
              <span className="size-2.5 bg-[#002FA7]/40 border border-[#002FA7]/50" />
              <span className="size-2.5 bg-[#002FA7]/70 border border-[#002FA7]/80" />
              <span className="size-2.5 bg-[#002FA7] border border-blue-500" />
              <span className="size-2.5 bg-blue-500 border border-white" />
              <span>MORE</span>
            </div>
          </div>
        </div>

        {/* Grid Container */}
        <div className="overflow-x-auto pb-2">
          <div className="inline-flex gap-1">
            {heatmapWeeks.map((week, wIndex) => (
              <div key={wIndex} className="flex flex-col gap-1">
                {week.map((day, dIndex) =>
                  day ? (
                    <div
                      key={day.date}
                      className={cn(
                        "size-3 border transition-colors cursor-pointer select-none",
                        HeatmapIntensityClass(day.level)
                      )}
                      title={`${day.date}: ${day.minutes} 分钟`}
                    />
                  ) : (
                    <div key={`empty-${dIndex}`} className="size-3 border border-transparent" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between font-mono text-[10px] text-zinc-600 pt-1">
          <span>WEEKDAY AXIS: SUN → SAT</span>
          <span>52 WEEKS WINDOW</span>
        </div>
      </section>
    </div>
  );
}
