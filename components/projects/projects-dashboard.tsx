"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Check, Folder, GraduationCap, Layers, Plus, Trash2, ArrowRight } from "lucide-react";
import type { Project, Task } from "@/db/schema";
import {
  createProject,
  deleteProject,
} from "@/app/actions/projects";
import {
  createTask,
  deleteTask,
  updateTaskStatus,
} from "@/app/actions/tasks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type ProjectType = "general" | "book" | "course";
type TaskStatus = "todo" | "in_progress" | "done";

const TYPE_META: Record<
  ProjectType,
  { label: string; icon: typeof Layers }
> = {
  general: { label: "通用", icon: Layers },
  book: { label: "书籍", icon: BookOpen },
  course: { label: "网课", icon: GraduationCap },
};

const STATUS_FLOW: TaskStatus[] = ["todo", "in_progress", "done"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "待办",
  in_progress: "进行中",
  done: "已完成",
};

function nextStatus(status: TaskStatus): TaskStatus | null {
  const index = STATUS_FLOW.indexOf(status);
  if (index < 0 || index >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[index + 1];
}

function progressPercent(project: Project): number {
  if (!project.targetUnits || project.targetUnits <= 0) return 0;
  return Math.min(
    100,
    Math.round((project.currentUnits / project.targetUnits) * 100)
  );
}

export function ProjectsDashboard({
  projects,
  tasks,
}: {
  projects: Project[];
  tasks: Task[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(
    projects[0]?.id ?? null
  );

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>("general");
  const [targetUnits, setTargetUnits] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId]
  );

  const projectTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.projectId === selectedId)
        .filter((t) => (filterStatus === "all" ? true : t.status === filterStatus))
        .sort((a, b) => {
          const rank = { in_progress: 0, todo: 1, done: 2 } as const;
          return rank[a.status] - rank[b.status];
        }),
    [tasks, selectedId, filterStatus]
  );

  function refresh() {
    router.refresh();
  }

  function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim()) return;

    const units =
      projectType === "general" ? 0 : Number.parseInt(targetUnits || "0", 10);

    if (
      (projectType === "book" || projectType === "course") &&
      (!Number.isFinite(units) || units <= 0)
    ) {
      toast.error("书籍/网课请填写大于 0 的目标单位数");
      return;
    }

    startTransition(async () => {
      const result = await createProject({
        name: projectName.trim(),
        type: projectType,
        targetUnits: units,
      });
      if (!result.success) {
        toast.error(result.error ?? "创建项目失败");
        return;
      }
      toast.success("项目已创建");
      setProjectName("");
      setTargetUnits("");
      setProjectType("general");
      if (result.data) setSelectedId(result.data.id);
      refresh();
    });
  }

  function handleDeleteProject(id: string) {
    startTransition(async () => {
      const result = await deleteProject(id);
      if (!result.success) {
        toast.error(result.error ?? "删除失败");
        return;
      }
      toast.success("项目已删除");
      if (selectedId === id) {
        setSelectedId(projects.find((p) => p.id !== id)?.id ?? null);
      }
      refresh();
    });
  }

  function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !taskTitle.trim()) return;

    startTransition(async () => {
      const result = await createTask({
        projectId: selected.id,
        title: taskTitle.trim(),
        plannedDate: plannedDate || undefined,
      });
      if (!result.success) {
        toast.error(result.error ?? "创建待办失败");
        return;
      }
      toast.success("待办已添加");
      setTaskTitle("");
      setPlannedDate("");
      refresh();
    });
  }

  function handleAdvanceStatus(task: Task) {
    const next = nextStatus(task.status);
    if (!next) return;

    startTransition(async () => {
      const result = await updateTaskStatus(task.id, next);
      if (!result.success) {
        toast.error(result.error ?? "更新状态失败");
        return;
      }
      if (next === "done" && selected && (selected.type === "book" || selected.type === "course")) {
        toast.success("任务完成，进度已 +1");
      } else {
        toast.success(`已更新为 ${STATUS_LABEL[next]}`);
      }
      refresh();
    });
  }

  function handleDeleteTask(id: string) {
    startTransition(async () => {
      const result = await deleteTask(id);
      if (!result.success) {
        toast.error(result.error ?? "删除失败");
        return;
      }
      toast.success("待办已删除");
      refresh();
    });
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-black text-zinc-100">
      {/* Pane 2: Task Tree / Project List (w-72, border-r border-zinc-800) */}
      <section className="flex w-72 shrink-0 flex-col border-r border-zinc-800 bg-black">
        {/* Pane Header */}
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-800 px-3 bg-zinc-950">
          <div className="flex items-center gap-1.5">
            <Folder className="size-3.5 text-zinc-400" />
            <span className="font-mono text-[11px] font-semibold text-zinc-300 uppercase tracking-wider">
              PROJECTS ({projects.length})
            </span>
          </div>
        </div>

        {/* Project Tree Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {projects.length === 0 ? (
            <div className="p-4 text-center text-xs font-mono text-zinc-600">
              NO PROJECTS
            </div>
          ) : (
            projects.map((project) => {
              const meta = TYPE_META[project.type];
              const Icon = meta.icon;
              const active = project.id === selectedId;
              const pct = progressPercent(project);

              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedId(project.id)}
                  className={cn(
                    "group flex cursor-pointer flex-col gap-1 p-2.5 transition-colors border-l-2",
                    active
                      ? "border-l-blue-600 bg-zinc-900/90 text-white"
                      : "border-l-transparent text-zinc-400 hover:bg-zinc-950 hover:text-zinc-200"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className={cn("size-3.5 shrink-0", active ? "text-blue-500" : "text-zinc-500")} />
                      <span className="truncate font-mono text-xs font-medium">
                        {project.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      title="删除项目"
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-zinc-500 hover:text-red-400 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pl-5.5">
                    <span>{meta.label}</span>
                    {project.type !== "general" ? (
                      <span>{project.currentUnits}/{project.targetUnits} ({pct}%)</span>
                    ) : null}
                  </div>

                  {project.type !== "general" ? (
                    <div className="mt-1 pl-5.5">
                      <Progress value={pct} className="h-1" />
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        {/* Create Project Form docked at bottom */}
        <form
          onSubmit={handleCreateProject}
          className="border-t border-zinc-800 bg-black p-3 space-y-2 shrink-0"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              NEW PROJECT
            </span>
          </div>
          <Input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="项目名称..."
            disabled={pending}
            required
            className="h-7 text-xs font-mono"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Select
              value={projectType}
              onValueChange={(v) => setProjectType(v as ProjectType)}
              disabled={pending}
            >
              <SelectTrigger size="sm" className="h-7 text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">通用</SelectItem>
                <SelectItem value="book">书籍</SelectItem>
                <SelectItem value="course">网课</SelectItem>
              </SelectContent>
            </Select>
            {projectType !== "general" ? (
              <Input
                type="number"
                min={1}
                value={targetUnits}
                onChange={(e) => setTargetUnits(e.target.value)}
                placeholder="目标总量"
                disabled={pending}
                required
                className="h-7 text-xs font-mono"
              />
            ) : (
              <div className="flex items-center justify-center border border-zinc-900 bg-zinc-950 font-mono text-[10px] text-zinc-600">
                GENERAL
              </div>
            )}
          </div>
          <Button type="submit" size="sm" className="w-full h-7 text-xs" disabled={pending}>
            <Plus data-icon="inline-start" />
            CREATE
          </Button>
        </form>
      </section>

      {/* Pane 3: Main Workspace (Task List & Detail Grid) */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-black">
        {!selected ? (
          <div className="flex h-full items-center justify-center font-mono text-xs text-zinc-600">
            SELECT OR CREATE A PROJECT TO MANAGE TASKS
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden">
            {/* Top Workspace Header */}
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-800 px-4 bg-black">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-white">
                  {selected.name}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {TYPE_META[selected.type].label}
                </Badge>
                {selected.type !== "general" ? (
                  <span className="font-mono text-xs text-zinc-400">
                    进度：{selected.currentUnits} / {selected.targetUnits}
                    {selected.type === "book" ? " 页" : " 集"}
                  </span>
                ) : null}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 font-mono text-xs">
                {(["all", "todo", "in_progress", "done"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={cn(
                      "px-2 py-1 uppercase transition-colors cursor-pointer border",
                      filterStatus === st
                        ? "border-blue-600 bg-blue-600/20 text-white"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {st === "all" ? "全部" : STATUS_LABEL[st]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Add Task Input Bar */}
            <form
              onSubmit={handleCreateTask}
              className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-950 p-2.5"
            >
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={`在「${selected.name}」中添加待办任务...`}
                disabled={pending}
                required
                className="flex-1 font-mono text-xs"
              />
              <Input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                disabled={pending}
                className="w-36 font-mono text-xs"
              />
              <Button type="submit" size="sm" disabled={pending}>
                <Plus data-icon="inline-start" />
                ADD TASK
              </Button>
            </form>

            <div className="flex-1 overflow-y-auto">
              {projectTasks.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center font-mono text-xs text-zinc-600">
                  <span>NO TASKS UNDER CURRENT FILTER</span>
                  <span className="text-[11px] text-zinc-700 mt-1">添加一条待办开始流转</span>
                </div>
              ) : (
                <div className="divide-y divide-zinc-900">
                  {projectTasks.map((task) => {
                    const next = nextStatus(task.status);
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "group flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-950 transition-colors",
                          task.status === "done" && "opacity-60 bg-black"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={cn(
                              "size-2 shrink-0",
                              task.status === "done"
                                ? "bg-zinc-700"
                                : task.status === "in_progress"
                                ? "bg-amber-500"
                                : "bg-blue-600"
                            )}
                          />
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "truncate font-mono text-xs font-medium text-zinc-200",
                                task.status === "done" && "line-through text-zinc-500"
                              )}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 font-mono text-[10px] text-zinc-500">
                              <span>状态: {STATUS_LABEL[task.status]}</span>
                              {task.plannedDate ? (
                                <span>· 计划: {task.plannedDate}</span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {next ? (
                            <Button
                              type="button"
                              size="xs"
                              variant={next === "done" ? "default" : "outline"}
                              disabled={pending}
                              onClick={() => handleAdvanceStatus(task)}
                            >
                              <ArrowRight data-icon="inline-end" />
                              {STATUS_LABEL[next]}
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              <Check className="size-3" /> DONE
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            className="text-zinc-600 hover:text-red-400"
                            disabled={pending}
                            onClick={() => handleDeleteTask(task.id)}
                            title="删除任务"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
