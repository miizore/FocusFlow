"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, PictureInPicture2, Play, Square } from "lucide-react";
import type { Project, Task } from "@/db/schema";
import type { FocusTimelineItem } from "@/app/actions/focus";
import {
  manualAddFocusSession,
  recordFocusSession,
} from "@/app/actions/focus";
import { useFocusStore } from "@/store/use-focus-store";
import {
  findOverlappingSession,
  formatDuration,
  MIN_FOCUS_SECONDS,
} from "@/lib/focus-rules";
import {
  broadcastFocusSync,
  hideMiniTimerWindow,
  isTauriApp,
  showMiniTimerWindow,
  subscribeFocusSync,
  type FocusSyncPayload,
} from "@/lib/tauri-bridge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TaskOption = Task & { projectName: string };

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function FocusWorkspace({
  tasks,
  projects,
  timeline,
}: {
  tasks: Task[];
  projects: Project[];
  timeline: FocusTimelineItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fragmentOpen, setFragmentOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [manualTaskId, setManualTaskId] = useState<string>("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [inTauri, setInTauri] = useState(false);

  const {
    activeTaskId,
    activeProjectName,
    activeTaskTitle,
    isRunning,
    isPaused,
    elapsedSeconds,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    tick,
    buildSessionWindow,
  } = useFocusStore();

  useEffect(() => {
    setInTauri(isTauriApp());
  }, []);

  const taskOptions: TaskOption[] = useMemo(() => {
    const projectMap = new Map(projects.map((p) => [p.id, p.name]));
    return tasks
      .filter((t) => t.status !== "done")
      .map((t) => ({
        ...t,
        projectName: projectMap.get(t.projectId) ?? "未知项目",
      }));
  }, [tasks, projects]);

  useEffect(() => {
    if (!selectedTaskId && taskOptions[0]) {
      setSelectedTaskId(taskOptions[0].id);
    }
    if (!manualTaskId && taskOptions[0]) {
      setManualTaskId(taskOptions[0].id);
    }
  }, [taskOptions, selectedTaskId, manualTaskId]);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const id = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(id);
  }, [isRunning, isPaused, tick]);

  // Synchronize state outwards to Mini-Timer window / tabs whenever status changes
  useEffect(() => {
    void broadcastFocusSync({
      type: "STATE_SYNC",
      activeTaskId,
      activeProjectName,
      activeTaskTitle,
      isRunning,
      isPaused,
      elapsedSeconds,
    });
  }, [activeTaskId, activeProjectName, activeTaskTitle, isRunning, isPaused, elapsedSeconds]);

  // Listen to remote actions triggered by Floating Mini-Timer (Pause/Resume/Stop/State request)
  useEffect(() => {
    const unsubscribe = subscribeFocusSync((payload: FocusSyncPayload) => {
      if (payload.type === "ACTION_PAUSE") {
        pauseTimer();
      } else if (payload.type === "ACTION_RESUME") {
        resumeTimer();
      } else if (payload.type === "ACTION_STOP") {
        handleStop();
      } else if (payload.type === "STATE_SYNC" && !payload.isRunning) {
        // Broadcast current state back if Mini Timer asks
        const current = useFocusStore.getState();
        void broadcastFocusSync({
          type: "STATE_SYNC",
          activeTaskId: current.activeTaskId,
          activeProjectName: current.activeProjectName,
          activeTaskTitle: current.activeTaskTitle,
          isRunning: current.isRunning,
          isPaused: current.isPaused,
          elapsedSeconds: current.elapsedSeconds,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  });

  // Lifecycle settlement: page close / refresh / tab discard / Tauri close
  useEffect(() => {
    const settle = () => {
      const windowPayload = useFocusStore.getState().buildSessionWindow();
      if (!windowPayload || windowPayload.elapsedSeconds < MIN_FOCUS_SECONDS) {
        return;
      }
      const body = JSON.stringify({
        taskId: windowPayload.taskId,
        startedAt: windowPayload.startedAt.toISOString(),
        endedAt: windowPayload.endedAt.toISOString(),
      });
      void fetch("/api/focus/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") settle();
    };

    window.addEventListener("pagehide", settle);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", settle);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  function handleStart() {
    const task = taskOptions.find((t) => t.id === selectedTaskId);
    if (!task) {
      toast.error("请先选择一个待办任务");
      return;
    }
    if (activeTaskId) {
      toast.error("已有进行中的专注，请先结束当前会话");
      return;
    }
    startTimer(task.id, task.projectName, task.title);
    toast.success("专注已开始");
  }

  function persistSession(windowPayload: NonNullable<ReturnType<typeof buildSessionWindow>>) {
    startTransition(async () => {
      const result = await recordFocusSession({
        taskId: windowPayload.taskId,
        startedAt: windowPayload.startedAt,
        endedAt: windowPayload.endedAt,
      });

      stopTimer();
      void hideMiniTimerWindow();

      if (result.rejected) {
        setFragmentOpen(true);
        return;
      }
      if (!result.success) {
        toast.error(result.error ?? "写入专注记录失败");
        return;
      }
      if (result.truncated) {
        toast.warning("单次专注超过 4 小时，已按幽灵截断规则记为 4 小时");
      } else {
        toast.success("专注记录已保存");
      }
      router.refresh();
    });
  }

  function handleStop() {
    const windowPayload = buildSessionWindow();
    if (!windowPayload) {
      stopTimer();
      void hideMiniTimerWindow();
      return;
    }
    if (windowPayload.elapsedSeconds < MIN_FOCUS_SECONDS) {
      stopTimer();
      void hideMiniTimerWindow();
      setFragmentOpen(true);
      return;
    }
    persistSession(windowPayload);
  }

  async function handleOpenMiniTimer() {
    const success = await showMiniTimerWindow();
    if (success) {
      toast.success(inTauri ? "已唤起桌面悬浮小窗" : "已唤起独立悬浮小窗");
    } else {
      toast.info("未能开启悬浮小窗，请检查弹窗拦截设置");
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTaskId || !manualStart || !manualEnd) {
      toast.error("请完整填写补录信息");
      return;
    }

    const startedAt = new Date(manualStart);
    const endedAt = new Date(manualEnd);
    const duration = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);

    if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) {
      toast.error("时间格式无效");
      return;
    }
    if (duration <= 0) {
      toast.error("结束时间必须大于开始时间");
      return;
    }
    if (duration < MIN_FOCUS_SECONDS) {
      toast.error("手动补录时间不能少于 5 分钟");
      return;
    }

    const overlap = findOverlappingSession(
      { startedAt, endedAt },
      timeline.map((item) => ({
        startedAt: item.startedAt,
        endedAt: item.endedAt,
      }))
    );
    if (overlap) {
      toast.error("时间冲突：与已有专注记录重叠");
      return;
    }

    startTransition(async () => {
      const result = await manualAddFocusSession({
        taskId: manualTaskId,
        startedAt,
        endedAt,
      });
      if (!result.success) {
        toast.error(result.error ?? "补录失败");
        return;
      }
      toast.success("手动补录已写入时间轴");
      setManualStart("");
      setManualEnd("");
      router.refresh();
    });
  }

  const active = Boolean(activeTaskId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Focus & Timeline</h1>
          {inTauri ? (
            <Badge variant="outline" className="border-klein text-blue-300">
              Tauri 原生桌面增强
            </Badge>
          ) : null}
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          正计时驱动时间轴。不足 5 分钟丢弃；超过 4 小时截断；补录必须通过冲突检测。
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded-2xl bg-card/55 p-6 ring-1 ring-white/10 backdrop-blur-xl">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Live Timer
              </p>
              <p className="mt-2 font-mono text-5xl font-semibold tracking-tight text-foreground tabular-nums">
                {formatDuration(elapsedSeconds)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                className={
                  active
                    ? isPaused
                      ? "bg-amber-500/20 text-amber-100"
                      : "bg-klein/40 text-blue-100"
                    : "bg-white/5 text-muted-foreground"
                }
              >
                {!active ? "空闲" : isPaused ? "已暂停" : "专注中"}
              </Badge>
            </div>
          </div>

          {active ? (
            <div className="rounded-xl bg-black/30 px-4 py-3 ring-1 ring-white/5">
              <p className="text-sm font-medium">{activeTaskTitle}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {activeProjectName}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>选择待办</Label>
              <Select
                value={selectedTaskId}
                onValueChange={setSelectedTaskId}
                disabled={pending || taskOptions.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择要专注的任务" />
                </SelectTrigger>
                <SelectContent>
                  {taskOptions.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.projectName} · {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {taskOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  没有可专注的未完成待办，请先在 Projects 中创建。
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!active ? (
              <Button onClick={handleStart} disabled={pending || !selectedTaskId}>
                <Play data-icon="inline-start" />
                开始专注
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button onClick={resumeTimer} disabled={pending}>
                    <Play data-icon="inline-start" />
                    继续
                  </Button>
                ) : (
                  <Button variant="outline" onClick={pauseTimer} disabled={pending}>
                    <Pause data-icon="inline-start" />
                    暂停
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={pending}
                >
                  <Square data-icon="inline-start" />
                  结束
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleOpenMiniTimer}
                  title="唤起置顶悬浮小窗"
                >
                  <PictureInPicture2 data-icon="inline-start" />
                  悬浮小窗
                </Button>
              </>
            )}
          </div>
        </div>

        <form
          onSubmit={handleManualSubmit}
          className="space-y-4 rounded-2xl bg-card/55 p-6 ring-1 ring-white/10 backdrop-blur-xl"
        >
          <div>
            <h2 className="text-lg font-medium tracking-tight">手动补录</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              为过去的时间段补记专注，会自动进行无重叠冲突检测。
            </p>
          </div>

          <div className="space-y-2">
            <Label>关联待办</Label>
            <Select
              value={manualTaskId}
              onValueChange={setManualTaskId}
              disabled={pending || taskOptions.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择待办任务" />
              </SelectTrigger>
              <SelectContent>
                {taskOptions.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    {task.projectName} · {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="manual-start">开始时间</Label>
              <Input
                id="manual-start"
                type="datetime-local"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manual-end">结束时间</Label>
              <Input
                id="manual-end"
                type="datetime-local"
                value={manualEnd}
                onChange={(e) => setManualEnd(e.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                const end = new Date();
                const start = new Date(end.getTime() - 25 * 60 * 1000);
                setManualStart(toLocalInputValue(start));
                setManualEnd(toLocalInputValue(end));
              }}
            >
              填入过去 25 分钟
            </Button>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={pending || !manualTaskId || !manualStart || !manualEnd}
          >
            提交补录
          </Button>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl bg-card/55 p-6 ring-1 ring-white/10 backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-medium tracking-tight">时间轴 (Timeline)</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            所有沉淀下来的专注记录，严格按时间倒序收敛。
          </p>
        </div>

        {timeline.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            暂无有效专注记录。开启正计时或手动补录一段历史专注。
          </p>
        ) : (
          <div className="space-y-3">
            {timeline.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 rounded-xl bg-black/25 p-4 ring-1 ring-white/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.taskTitle}</span>
                    <Badge variant="outline" className="text-[11px]">
                      {item.projectName}
                    </Badge>
                    {item.isManual ? (
                      <Badge variant="secondary" className="text-[10px]">
                        手动补录
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {new Date(item.startedAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ~{" "}
                    {new Date(item.endedAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="font-mono text-sm font-medium text-blue-200">
                  {formatDuration(item.duration)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={fragmentOpen} onOpenChange={setFragmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>时间过短，视为碎片时间丢弃</DialogTitle>
            <DialogDescription>
              本次专注时长不足 5 分钟（300 秒），根据 PRD 硬性规则，系统不会向数据库写入任何碎片记录。保持深度专注，下次再接再厉！
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setFragmentOpen(false)}>知道了</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

