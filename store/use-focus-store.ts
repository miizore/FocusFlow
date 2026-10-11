import { create } from "zustand";

interface FocusState {
  activeTaskId: string | null;
  activeProjectName: string | null;
  activeTaskTitle: string | null;
  isRunning: boolean;
  isPaused: boolean;
  startTime: Date | null;
  elapsedSeconds: number;

  startTimer: (taskId: string, projectName: string, taskTitle: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tick: () => void;
  resetTimer: () => void;
  /** Build wall-clock window from active elapsed time for persistence. */
  buildSessionWindow: () => {
    taskId: string;
    startedAt: Date;
    endedAt: Date;
    elapsedSeconds: number;
  } | null;
}

export const useFocusStore = create<FocusState>((set, get) => ({
  activeTaskId: null,
  activeProjectName: null,
  activeTaskTitle: null,
  isRunning: false,
  isPaused: false,
  startTime: null,
  elapsedSeconds: 0,

  startTimer: (taskId, projectName, taskTitle) => {
    set({
      activeTaskId: taskId,
      activeProjectName: projectName,
      activeTaskTitle: taskTitle,
      isRunning: true,
      isPaused: false,
      startTime: new Date(),
      elapsedSeconds: 0,
    });
  },

  pauseTimer: () => {
    set({ isPaused: true, isRunning: false });
  },

  resumeTimer: () => {
    set({ isPaused: false, isRunning: true });
  },

  stopTimer: () => {
    set({
      activeTaskId: null,
      activeProjectName: null,
      activeTaskTitle: null,
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
    });
  },

  tick: () => {
    if (get().isRunning && !get().isPaused) {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }
  },

  resetTimer: () => {
    set({
      activeTaskId: null,
      activeProjectName: null,
      activeTaskTitle: null,
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
    });
  },

  buildSessionWindow: () => {
    const { activeTaskId, elapsedSeconds } = get();
    if (!activeTaskId || elapsedSeconds <= 0) return null;
    const endedAt = new Date();
    const startedAt = new Date(endedAt.getTime() - elapsedSeconds * 1000);
    return { taskId: activeTaskId, startedAt, endedAt, elapsedSeconds };
  },
}));
