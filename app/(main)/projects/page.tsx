import { Suspense } from "react";
import { getProjects } from "@/app/actions/projects";
import { getTasks } from "@/app/actions/tasks";
import { ProjectsDashboard } from "@/components/projects/projects-dashboard";

function ProjectsSkeleton() {
  return (
    <div className="flex h-full w-full bg-black">
      <div className="w-72 shrink-0 border-r border-zinc-800 p-3 space-y-3">
        <div className="h-4 w-28 bg-zinc-900 animate-pulse" />
        <div className="h-10 w-full bg-zinc-900 animate-pulse" />
        <div className="h-10 w-full bg-zinc-900 animate-pulse" />
      </div>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-8 w-48 bg-zinc-900 animate-pulse" />
        <div className="h-20 w-full bg-zinc-900 animate-pulse" />
      </div>
    </div>
  );
}

async function ProjectsContent() {
  const [projectsResult, tasksResult] = await Promise.all([
    getProjects(),
    getTasks(),
  ]);

  const projects = projectsResult.success ? (projectsResult.data ?? []) : [];
  const tasks = tasksResult.success ? (tasksResult.data ?? []) : [];

  return (
    <div className="flex h-full w-full flex-col">
      {!projectsResult.success || !tasksResult.success ? (
        <div className="border-b border-red-900 bg-red-950/60 px-4 py-2 text-xs font-mono text-red-400">
          DATA_LOAD_ERROR: {projectsResult.error || tasksResult.error || "UNKNOWN"}
        </div>
      ) : null}
      <ProjectsDashboard projects={projects} tasks={tasks} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={<ProjectsSkeleton />}>
      <ProjectsContent />
    </Suspense>
  );
}

