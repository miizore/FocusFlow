"use client";

import { useEffect, useState } from "react";
import { Pause, Play, Square, X, ExternalLink } from "lucide-react";
import { formatDuration } from "@/lib/focus-rules";
import {
  broadcastFocusSync,
  hideMiniTimerWindow,
  subscribeFocusSync,
  type FocusSyncPayload,
} from "@/lib/tauri-bridge";

export default function MiniTimerPage() {
  const [taskTitle, setTaskTitle] = useState<string>("等待专注启动...");
  const [projectName, setProjectName] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Subscribe to state sync broadcasts from main window
  useEffect(() => {
    const unsubscribe = subscribeFocusSync((payload: FocusSyncPayload) => {
      if (payload.type === "STATE_SYNC") {
        if (payload.activeTaskTitle) setTaskTitle(payload.activeTaskTitle);
        if (payload.activeProjectName !== undefined) setProjectName(payload.activeProjectName ?? "");
        if (payload.isRunning !== undefined) setIsRunning(payload.isRunning);
        if (payload.isPaused !== undefined) setIsPaused(payload.isPaused);
        if (payload.elapsedSeconds !== undefined) setElapsedSeconds(payload.elapsedSeconds);
      }
    });

    // Request initial state on mount
    void broadcastFocusSync({ type: "STATE_SYNC" });

    return () => {
      unsubscribe();
    };
  }, []);

  // Local second-by-second tick when running
  useEffect(() => {
    if (!isRunning || isPaused) return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning, isPaused]);

  function handlePause() {
    setIsPaused(true);
    void broadcastFocusSync({ type: "ACTION_PAUSE" });
  }

  function handleResume() {
    setIsPaused(false);
    void broadcastFocusSync({ type: "ACTION_RESUME" });
  }

  function handleStop() {
    setIsRunning(false);
    void broadcastFocusSync({ type: "ACTION_STOP" });
  }

  function handleClose() {
    void hideMiniTimerWindow();
    if (typeof window !== "undefined" && window.opener) {
      window.close();
    }
  }

  function handleFocusMain() {
    if (typeof window !== "undefined" && window.opener) {
      window.opener.focus();
    }
  }

  return (
    <div
      data-tauri-drag-region
      className="select-none flex h-screen w-screen flex-col justify-between overflow-hidden bg-black/85 p-3 text-white backdrop-blur-2xl ring-1 ring-white/15"
    >
      {/* Top drag & info bar */}
      <div data-tauri-drag-region className="flex items-center justify-between gap-2">
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-klein shadow-[0_0_8px_#002FA7]" />
          <p
            data-tauri-drag-region
            className="truncate text-xs font-medium text-zinc-200"
            title={taskTitle}
          >
            {taskTitle}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFocusMain}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            title="回到主窗口"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-red-400"
            title="关闭小窗"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Main duration & controls row */}
      <div data-tauri-drag-region className="flex items-center justify-between gap-3 pt-1">
        <div>
          <span className="font-mono text-3xl font-bold tracking-tight text-white tabular-nums drop-shadow-sm">
            {formatDuration(elapsedSeconds)}
          </span>
          {projectName ? (
            <p className="text-[10px] text-zinc-400 truncate max-w-[150px]">
              {projectName}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {!isRunning ? (
            <span className="text-xs text-zinc-500">已停止</span>
          ) : isPaused ? (
            <button
              type="button"
              onClick={handleResume}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-klein text-white transition hover:bg-blue-600 active:scale-95 shadow-md shadow-blue-900/30"
              title="继续"
            >
              <Play className="h-4 w-4 fill-current ml-0.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
              title="暂停"
            >
              <Pause className="h-4 w-4 fill-current" />
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/25 text-red-400 transition hover:bg-red-600 hover:text-white active:scale-95"
              title="结算结束"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

