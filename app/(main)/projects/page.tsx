import { Suspense } from "react";
import { getProjects } from "@/app/actions/projects";
import { getTasks } from "@/app/actions/tasks";
import { ProjectsDashboard } from "@/components/projects/projects-dashboard";

function ProjectsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <div className="space-y-2">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-white/5" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-80 animate-pulse rounded-2xl bg-white/5" />
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
    <div className="space-y-4">
      {!projectsResult.success || !tasksResult.success ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/30">
          数据加载失败：
          {projectsResult.error || tasksResult.error || "未知错误"}
        </p>
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
