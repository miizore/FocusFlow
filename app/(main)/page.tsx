import { Suspense } from "react";
import { connection } from "next/server";
import { getProjects } from "@/app/actions/projects";
import { getTasks } from "@/app/actions/tasks";
import { CommandDashboard } from "@/components/dashboard/command-dashboard";

function formatDayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function CommandSkeleton() {
  return (
    <div className="flex h-full w-full flex-col bg-black p-6 space-y-6">
      <div className="h-28 bg-zinc-950 border border-zinc-800 animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-zinc-950 border border-zinc-800 animate-pulse" />
        <div className="h-72 bg-zinc-950 border border-zinc-800 animate-pulse" />
      </div>
    </div>
  );
}

async function CommandContent() {
  await connection();
  const [projectsResult, tasksResult] = await Promise.all([
    getProjects(),
    getTasks(),
  ]);

  const projects = projectsResult.success ? (projectsResult.data ?? []) : [];
  const tasks = tasksResult.success ? (tasksResult.data ?? []) : [];

  const projectMap = new Map(projects.map((p) => [p.id, p.name]));

  const todayStr = formatDayKey(new Date());

  // Filter tasks planned for today (or fallback to created today if plannedDate is null and not done)
  const todayTasks = tasks
    .filter((t) => {
      if (t.plannedDate) {
        return t.plannedDate === todayStr;
      }
      // If no plannedDate but status is in_progress, also show in today
      return t.status === "in_progress";
    })
    .map((t) => ({
      ...t,
      projectName: projectMap.get(t.projectId) ?? "未知项目",
    }));

  return (
    <CommandDashboard
      activeProjects={projects}
      todayTasks={todayTasks}
    />
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<CommandSkeleton />}>
      <CommandContent />
    </Suspense>
  );
}
