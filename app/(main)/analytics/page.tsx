import { Suspense } from "react";
import { connection } from "next/server";
import { getProAnalytics } from "@/app/actions/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

function AnalyticsSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-black p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-24 bg-zinc-950 animate-pulse border border-zinc-800" />
        <div className="h-24 bg-zinc-950 animate-pulse border border-zinc-800" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-zinc-950 animate-pulse border border-zinc-800" />
        <div className="h-72 bg-zinc-950 animate-pulse border border-zinc-800" />
      </div>
      <div className="h-44 bg-zinc-950 animate-pulse border border-zinc-800" />
    </div>
  );
}

async function AnalyticsContent() {
  await connection();
  const res = await getProAnalytics();

  if (!res.success || !res.data) {
    return (
      <div className="border border-red-900 bg-red-950/60 p-4 font-mono text-xs text-red-400 m-6">
        DATA_LOAD_ERROR: {res.error || "UNKNOWN"}
      </div>
    );
  }

  return <AnalyticsDashboard data={res.data} />;
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent />
    </Suspense>
  );
}
