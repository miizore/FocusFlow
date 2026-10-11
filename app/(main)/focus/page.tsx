import { Suspense } from "react";
import { getProjects } from "@/app/actions/projects";
import { getTasks } from "@/app/actions/tasks";
import { getFocusTimeline } from "@/app/actions/focus";
import { FocusWorkspace } from "@/components/focus/focus-workspace";

function FocusSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-white/5" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/5" />
      </div>
    </div>
  );
}

async function FocusContent() {
  const [projectsResult, tasksResult, timelineResult] = await Promise.all([
    getProjects(),
    getTasks(),
    getFocusTimeline(),
  ]);

  const projects = projectsResult.success ? (projectsResult.data ?? []) : [];
  const tasks = tasksResult.success ? (tasksResult.data ?? []) : [];
  const timeline = timelineResult.success ? (timelineResult.data ?? []) : [];

  return (
    <div className="space-y-4">
      {!projectsResult.success ||
      !tasksResult.success ||
      !timelineResult.success ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
          数据加载失败：
          {projectsResult.error ||
            tasksResult.error ||
            timelineResult.error ||
            "未知错误"}
        </p>
      ) : null}
      <FocusWorkspace
        projects={projects}
        tasks={tasks}
        timeline={timeline}
      />
    </div>
  );
}

export default function FocusPage() {
  return (
    <Suspense fallback={<FocusSkeleton />}>
      <FocusContent />
    </Suspense>
  );
}
