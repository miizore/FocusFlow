"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, GraduationCap, Layers, Plus, Trash2 } from "lucide-react";
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
  todo: "Todo",
  in_progress: "进行中",
  done: "完成",
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

  const selected = useMemo(
    () => projects.find((p) => p.id === selectedId) ?? null,
    [projects, selectedId]
  );

  const projectTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.projectId === selectedId)
        .sort((a, b) => {
          const rank = { in_progress: 0, todo: 1, done: 2 } as const;
          return rank[a.status] - rank[b.status];
        }),
    [tasks, selectedId]
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projects & Tasks</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          项目归类驱动每日待办；书籍与网课在任务完成时自动推进进度。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <section className="space-y-4">
          <form
            onSubmit={handleCreateProject}
            className="space-y-3 rounded-2xl bg-card/60 p-4 ring-1 ring-white/10 backdrop-blur-xl"
          >
            <p className="text-sm font-medium">新建项目</p>
            <div className="space-y-2">
              <Label htmlFor="project-name">名称</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="例如：深度工作 / 设计模式 / CSAPP"
                disabled={pending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={projectType}
                onValueChange={(v) => setProjectType(v as ProjectType)}
                disabled={pending}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">通用分类</SelectItem>
                  <SelectItem value="book">书籍阅读</SelectItem>
                  <SelectItem value="course">网课</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {projectType !== "general" ? (
              <div className="space-y-2">
                <Label htmlFor="target-units">
                  {projectType === "book" ? "总页数" : "总集数"}
                </Label>
                <Input
                  id="target-units"
                  type="number"
                  min={1}
                  value={targetUnits}
                  onChange={(e) => setTargetUnits(e.target.value)}
                  placeholder={projectType === "book" ? "例如 320" : "例如 24"}
                  disabled={pending}
                  required
                />
              </div>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              <Plus data-icon="inline-start" />
              添加项目
            </Button>
          </form>

          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="rounded-2xl bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-white/5">
                还没有项目。先创建一个分类、书籍或网课。
              </p>
            ) : (
              projects.map((project) => {
                const meta = TYPE_META[project.type];
                const Icon = meta.icon;
                const active = project.id === selectedId;
                const pct = progressPercent(project);

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedId(project.id)}
                    className={cn(
                      "w-full rounded-2xl p-4 text-left transition-colors ring-1 backdrop-blur-xl",
                      active
                        ? "bg-klein/25 ring-klein/50"
                        : "bg-card/50 ring-white/10 hover:bg-card/80"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                          <Icon className="size-4 text-blue-300" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {project.name}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {meta.label}
                            {project.type !== "general"
                              ? ` · ${project.currentUnits}/${project.targetUnits}`
                              : null}
                          </span>
                        </span>
                      </div>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        disabled={pending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    {project.type !== "general" ? (
                      <div className="mt-3 space-y-1.5">
                        <Progress value={pct} className="h-1.5" />
                        <p className="text-[11px] text-muted-foreground">
                          进度 {pct}%
                        </p>
                      </div>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="min-h-[28rem] rounded-2xl bg-card/50 p-5 ring-1 ring-white/10 backdrop-blur-xl">
          {!selected ? (
            <div className="flex h-full min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
              选择左侧项目以管理待办
            </div>
          ) : (
            <div className="flex h-full flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {selected.name}
                    </h2>
                    <Badge variant="secondary" className="bg-white/5">
                      {TYPE_META[selected.type].label}
                    </Badge>
                  </div>
                  {selected.type !== "general" ? (
                    <p className="text-sm text-muted-foreground">
                      当前进度 {selected.currentUnits} / {selected.targetUnits}
                      {selected.type === "book" ? " 页" : " 集"}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {projectTasks.length} 条待办
                    </p>
                  )}
                </div>
              </div>

              <form
                onSubmit={handleCreateTask}
                className="grid gap-3 rounded-xl bg-black/30 p-3 ring-1 ring-white/5 sm:grid-cols-[1fr_auto_auto]"
              >
                <Input
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="添加今日待办…"
                  disabled={pending}
                  required
                />
                <Input
                  type="date"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  disabled={pending}
                  className="sm:w-40"
                />
                <Button type="submit" disabled={pending}>
                  <Plus data-icon="inline-start" />
                  添加
                </Button>
              </form>

              <div className="flex-1 space-y-2">
                {projectTasks.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    该项目暂无待办。添加第一条任务开始流转。
                  </p>
                ) : (
                  projectTasks.map((task) => {
                    const next = nextStatus(task.status);
                    return (
                      <div
                        key={task.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl bg-black/25 px-3 py-3 ring-1 ring-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              task.status === "done" &&
                                "text-muted-foreground line-through"
                            )}
                          >
                            {task.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {STATUS_LABEL[task.status]}
                            {task.plannedDate
                              ? ` · 计划 ${task.plannedDate}`
                              : null}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {next ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={next === "done" ? "default" : "outline"}
                              disabled={pending}
                              onClick={() => handleAdvanceStatus(task)}
                            >
                              → {STATUS_LABEL[next]}
                            </Button>
                          ) : (
                            <Badge className="bg-klein/30 text-blue-100">
                              Done
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={pending}
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
