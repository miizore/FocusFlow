import { Suspense } from "react";
import { getProjects } from "@/app/actions/projects";
import { getTasks } from "@/app/actions/tasks";
import { getFocusTimeline } from "@/app/actions/focus";
import { FocusWorkspace } from "@/components/focus/focus-workspace";

function FocusSkeleton() {
  return (
    <div className="flex h-full w-full bg-black">
      <div className="flex-1 p-6 space-y-6">
        <div className="h-6 w-32 bg-zinc-900 animate-pulse" />
        <div className="h-32 w-64 bg-zinc-900 animate-pulse mx-auto" />
      </div>
      <div className="w-96 border-l border-zinc-800 p-4 space-y-4">
        <div className="h-4 w-24 bg-zinc-900 animate-pulse" />
        <div className="h-16 w-full bg-zinc-900 animate-pulse" />
        <div className="h-16 w-full bg-zinc-900 animate-pulse" />
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
    <div className="flex h-full w-full flex-col">
      {!projectsResult.success ||
      !tasksResult.success ||
      !timelineResult.success ? (
        <div className="border-b border-red-900 bg-red-950/60 px-4 py-2 text-xs font-mono text-red-400">
          DATA_LOAD_ERROR:{" "}
          {projectsResult.error ||
            tasksResult.error ||
            timelineResult.error ||
            "UNKNOWN"}
        </div>
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

