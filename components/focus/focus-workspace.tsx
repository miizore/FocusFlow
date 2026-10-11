"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pause, PictureInPicture2, Play, Square } from "lucide-react";
import { VerticalTimeline } from "./vertical-timeline";
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
import { cn } from "@/lib/utils";
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
    <div className="flex h-full w-full overflow-hidden bg-black text-zinc-100">
      {/* Center Main Stage: Giant Minimalist Timer + Controls + Docked Manual Log */}
      <section className="flex flex-1 flex-col justify-between border-r border-zinc-800 bg-black p-6 overflow-y-auto">
        {/* Top Status & Mini-Timer bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "size-2",
                active
                  ? isPaused
                    ? "bg-amber-500"
                    : "bg-blue-500 animate-pulse"
                  : "bg-zinc-700"
              )}
            />
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400">
              FOCUS ENGINE // {!active ? "IDLE" : isPaused ? "PAUSED" : "ACTIVE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {inTauri ? (
              <Badge variant="outline" className="border-blue-600 text-blue-400 text-[10px]">
                TAURI
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="xs"
              onClick={handleOpenMiniTimer}
              title="�����ö�����С��"
            >
              <PictureInPicture2 data-icon="inline-start" />
              MINI-TIMER
            </Button>
          </div>
        </div>

        {/* Center: Giant Minimalist Digital Clock */}
        <div className="flex flex-col items-center justify-center my-auto py-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="font-mono text-7xl md:text-8xl lg:text-9xl font-bold tracking-tighter text-white tabular-nums select-none">
              {formatDuration(elapsedSeconds)}
            </p>
            {active ? (
              <div className="inline-flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-1 font-mono text-xs">
                <span className="text-blue-400 font-semibold">{activeProjectName}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-zinc-200">{activeTaskTitle}</span>
              </div>
            ) : (
              <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
                SELECT A TASK TO START SESSION
              </p>
            )}
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-col items-center gap-3 w-full max-w-sm">
            {!active ? (
              <div className="w-full space-y-2.5">
                <Select
                  value={selectedTaskId}
                  onValueChange={setSelectedTaskId}
                  disabled={pending || taskOptions.length === 0}
                >
                  <SelectTrigger className="w-full font-mono text-xs h-8">
                    <SelectValue placeholder="选择要专注的任务" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskOptions.map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.projectName} / {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleStart}
                  disabled={pending || !selectedTaskId}
                  className="w-full h-9 text-xs font-mono font-semibold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white"
                >
                  <Play data-icon="inline-start" />
                  START FOCUS
                </Button>
              </div>
            ) : (
              <div className="flex w-full items-center gap-2">
                {isPaused ? (
                  <Button
                    onClick={resumeTimer}
                    disabled={pending}
                    className="flex-1 h-9 text-xs font-mono uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white"
                  >
                    <Play data-icon="inline-start" />
                    RESUME
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={pauseTimer}
                    disabled={pending}
                    className="flex-1 h-9 text-xs font-mono uppercase tracking-wider"
                  >
                    <Pause data-icon="inline-start" />
                    PAUSE
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleStop}
                  disabled={pending}
                  className="flex-1 h-9 text-xs font-mono uppercase tracking-wider"
                >
                  <Square data-icon="inline-start" />
                  FINISH
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Dock: Manual Record Form */}
        <div className="border-t border-zinc-800 pt-3 bg-black">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                MANUAL LOG // 历史补录
              </span>
              <button
                type="button"
                onClick={() => {
                  const end = new Date();
                  const start = new Date(end.getTime() - 25 * 60 * 1000);
                  setManualStart(toLocalInputValue(start));
                  setManualEnd(toLocalInputValue(end));
                }}
                className="font-mono text-[10px] text-blue-400 hover:underline cursor-pointer"
              >
                +25M PAST
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Select
                value={manualTaskId}
                onValueChange={setManualTaskId}
                disabled={pending || taskOptions.length === 0}
              >
                <SelectTrigger className="font-mono text-xs h-7">
                  <SelectValue placeholder="选择待办任务" />
                </SelectTrigger>
                <SelectContent>
                  {taskOptions.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      {task.projectName} / {task.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="datetime-local"
                value={manualStart}
                onChange={(e) => setManualStart(e.target.value)}
                disabled={pending}
                className="h-7 font-mono text-xs"
              />

              <div className="flex gap-1.5">
                <Input
                  type="datetime-local"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  disabled={pending}
                  className="h-7 font-mono text-xs flex-1"
                />
                <Button
                  type="submit"
                  size="xs"
                  className="h-7 px-3 text-[10px] shrink-0 font-mono uppercase"
                  disabled={pending || !manualTaskId || !manualStart || !manualEnd}
                >
                  SUBMIT
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {/* Right Pane: 24h Vertical Timeline */}
      <VerticalTimeline timeline={timeline} />

      {/* Fragment Dialog (< 5 minutes discard warning) */}
      <Dialog open={fragmentOpen} onOpenChange={setFragmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>专注时间过短，视为碎片丢弃</DialogTitle>
            <DialogDescription>
              本次正计时时长不足 5 分钟（300 秒）。根据硬性规则，系统拒绝向数据库写入任何碎片记录。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setFragmentOpen(false)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs"
            >
              CONFIRM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

