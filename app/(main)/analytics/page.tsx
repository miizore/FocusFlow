import { Suspense } from "react";
import { connection } from "next/server";
import {
  getFocusTrendLast14Days,
  getMonthTaskCompletion,
} from "@/app/actions/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

function AnalyticsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-white/5" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
    </div>
  );
}

async function AnalyticsContent() {
  await connection();
  const now = new Date();
  const [monthResult, trendResult] = await Promise.all([
    getMonthTaskCompletion(now.getFullYear(), now.getMonth()),
    getFocusTrendLast14Days(),
  ]);

  if (!monthResult.success || !trendResult.success || !monthResult.data) {
    return (
      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
        数据加载失败：
        {monthResult.error || trendResult.error || "未知错误"}
      </p>
    );
  }

  return (
    <AnalyticsDashboard
      monthLabel={monthResult.data.label}
      cells={monthResult.data.cells}
      totalCompleted={monthResult.data.totalCompleted}
      trend={trendResult.data ?? []}
    />
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
