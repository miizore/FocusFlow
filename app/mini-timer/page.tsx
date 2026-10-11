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
      className="select-none flex h-screen w-screen flex-col justify-between overflow-hidden bg-black p-3 text-white border border-zinc-800 rounded-none shadow-none font-mono"
    >
      {/* Top drag & info bar */}
      <div data-tauri-drag-region className="flex items-center justify-between gap-2 border-b border-zinc-900 pb-1.5">
        <div data-tauri-drag-region className="flex min-w-0 items-center gap-1.5">
          <span className="size-1.5 bg-blue-500" />
          <p
            data-tauri-drag-region
            className="truncate text-xs font-semibold text-zinc-300 uppercase tracking-wider"
            title={taskTitle}
          >
            {taskTitle}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFocusMain}
            className="p-1 text-zinc-500 hover:bg-zinc-900 hover:text-white transition-colors cursor-pointer"
            title="回到主窗口"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-zinc-500 hover:bg-zinc-900 hover:text-red-400 transition-colors cursor-pointer"
            title="关闭小窗"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Main duration & controls row */}
      <div data-tauri-drag-region className="flex items-center justify-between gap-3 pt-1">
        <div>
          <span className="font-mono text-3xl font-bold tracking-tight text-white tabular-nums">
            {formatDuration(elapsedSeconds)}
          </span>
          {projectName ? (
            <p className="text-[10px] text-zinc-500 truncate max-w-[150px] uppercase">
              {projectName}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {!isRunning ? (
            <span className="text-[10px] text-zinc-600 uppercase border border-zinc-900 px-1.5 py-0.5">IDLE</span>
          ) : isPaused ? (
            <button
              type="button"
              onClick={handleResume}
              className="flex h-7 px-2.5 items-center justify-center border border-blue-600 bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer text-xs uppercase"
              title="继续"
            >
              <Play className="h-3 w-3 fill-current mr-1" />
              RUN
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="flex h-7 px-2.5 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer text-xs uppercase"
              title="暂停"
            >
              <Pause className="h-3 w-3 fill-current mr-1" />
              PAUSE
            </button>
          )}

          {isRunning && (
            <button
              type="button"
              onClick={handleStop}
              className="flex h-7 px-2.5 items-center justify-center border border-red-900 bg-red-950/80 text-red-300 hover:bg-red-900 hover:text-white transition-colors cursor-pointer text-xs uppercase"
              title="结算结束"
            >
              <Square className="h-3 w-3 fill-current mr-1" />
              STOP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
