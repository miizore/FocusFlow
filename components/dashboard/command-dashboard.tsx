"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Check, FolderKanban, Plus } from "lucide-react";
import type { Project, Task } from "@/db/schema";
import { createTask, updateTaskStatus } from "@/app/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { CommandHeader } from "./command-header";
import { cn } from "@/lib/utils";

export function CommandDashboard({
  activeProjects,
  todayTasks,
}: {
  activeProjects: Project[];
  todayTasks: (Task & { projectName: string })[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    activeProjects[0]?.id ?? ""
  );

  const handleToggleTask = (task: Task) => {
    const nextStatus = task.status === "done" ? "todo" : "done";
    startTransition(async () => {
      const res = await updateTaskStatus(task.id, nextStatus);
      if (!res.success) {
        toast.error(res.error ?? "更新任务状态失败");
      } else {
        router.refresh();
      }
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !selectedProjectId) return;

    const pad = (n: number) => String(n).padStart(2, "0");
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    startTransition(async () => {
      const res = await createTask({
        projectId: selectedProjectId,
        title: newTaskTitle.trim(),
        plannedDate: todayStr,
      });
      if (!res.success) {
        toast.error(res.error ?? "添加任务失败");
      } else {
        toast.success("已添加到今日待办");
        setNewTaskTitle("");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-black p-6 select-text text-zinc-100 space-y-6">
      {/* Top Section: Dynamic Clock + Weather */}
      <CommandHeader />

      {/* Main Dual-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Active Projects Progress */}
        <section className="border border-zinc-800 bg-black flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/80">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-4 text-zinc-400" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                ACTIVE PROJECTS PROGRESS // 进行中项目
              </h2>
            </div>
            <Link
              href="/projects"
              className="font-mono text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              ALL_PROJECTS <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="p-4 divide-y divide-zinc-900">
            {activeProjects.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-600">
                <span>暂无进行中的项目</span>
                <div className="pt-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href="/projects">前往创建项目</Link>
                  </Button>
                </div>
              </div>
            ) : (
              activeProjects.map((p) => {
                const isTracker = p.type === "book" || p.type === "course";
                const percent =
                  isTracker && p.targetUnits > 0
                    ? Math.min(100, Math.round((p.currentUnits / p.targetUnits) * 100))
                    : 100;

                return (
                  <div key={p.id} className="py-3 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate text-zinc-200 font-medium">
                          {p.name}
                        </span>
                        <span className="border border-zinc-800 bg-zinc-900 px-1 py-0.5 text-[9px] uppercase text-zinc-500 shrink-0">
                          {p.type}
                        </span>
                      </div>
                      <div className="font-mono text-xs tabular-nums text-zinc-400 shrink-0">
                        {isTracker ? (
                          <>
                            <span className="text-white font-semibold">
                              {p.currentUnits}
                            </span>
                            <span className="text-zinc-600"> / {p.targetUnits}</span>{" "}
                            <span className="text-blue-400 font-semibold">({percent}%)</span>
                          </>
                        ) : (
                          <span className="text-zinc-500">GENERAL</span>
                        )}
                      </div>
                    </div>

                    <Progress value={percent} className="h-1.5" />
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Today's Tasks */}
        <section className="border border-zinc-800 bg-black flex flex-col">
          <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-950/80">
            <div className="flex items-center gap-2">
              <span className="size-2 bg-[#002FA7]" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
                TODAY&apos;S TASKS // 今日待办 ({todayTasks.filter((t) => t.status === "done").length}/{todayTasks.length})
              </h2>
            </div>
            <Link
              href="/focus"
              className="font-mono text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              FOCUS_ROOM <ArrowRight className="size-3" />
            </Link>
          </div>

          {/* Quick Add Task to Today */}
          {activeProjects.length > 0 && (
            <form onSubmit={handleCreateTask} className="p-3 border-b border-zinc-800 flex gap-2 bg-zinc-950/40">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-8 border border-zinc-800 bg-black px-2 text-xs font-mono text-zinc-300 outline-none w-36 shrink-0"
              >
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-950 text-white">
                    {p.name}
                  </option>
                ))}
              </select>
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="快速添加今日待办..."
                className="flex-1"
                disabled={pending}
              />
              <Button type="submit" size="sm" disabled={pending || !newTaskTitle.trim()} className="shrink-0">
                <Plus className="size-3.5" />
                <span>ADD</span>
              </Button>
            </form>
          )}

          {/* Task List */}
          <div className="p-3 divide-y divide-zinc-900 max-h-[460px] overflow-y-auto">
            {todayTasks.length === 0 ? (
              <div className="py-12 text-center font-mono text-xs text-zinc-600">
                <span>今日暂无计划任务</span>
                <p className="text-[10px] text-zinc-700 mt-1">
                  在上方输入框或进入 Projects 页面规划今日待办
                </p>
              </div>
            ) : (
              todayTasks.map((task) => {
                const isDone = task.status === "done";
                return (
                  <div
                    key={task.id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTask(task)}
                        disabled={pending}
                        title={isDone ? "标记为未完成" : "标记为已完成"}
                        className={cn(
                          "size-5 shrink-0 border flex items-center justify-center transition-colors cursor-pointer",
                          isDone
                            ? "border-[#002FA7] bg-[#002FA7] text-white"
                            : "border-zinc-700 bg-black text-transparent hover:border-zinc-500 hover:text-zinc-700"
                        )}
                      >
                        <Check className={cn("size-3", !isDone && "opacity-0")} />
                      </button>
                      <div className="min-w-0">
                        <p
                          className={cn(
                            "font-mono text-xs truncate transition-colors",
                            isDone ? "text-zinc-600 line-through" : "text-zinc-200"
                          )}
                        >
                          {task.title}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-500">
                          {task.projectName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={cn(
                        "font-mono text-[9px] uppercase px-1.5 py-0.5 border shrink-0",
                        isDone
                          ? "border-zinc-800 bg-zinc-900 text-zinc-600"
                          : task.status === "in_progress"
                          ? "border-amber-900/60 bg-amber-950/40 text-amber-400"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400"
                      )}
                    >
                      {task.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <footer className="border-t border-zinc-800 pt-3 text-[11px] font-mono text-zinc-600 flex justify-between">
        <span>FOCUSFLOW // COMMAND CENTER v2.0</span>
        <span>IDE ARCHITECTURE ONLINE</span>
      </footer>
    </div>
  );
}
