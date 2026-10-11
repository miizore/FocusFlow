/**
 * Tauri 2.0 Native Bridge & Graceful Degradation Adapter
 * 
 * Provides:
 * 1. Safe runtime probe for Tauri desktop container (`isTauriApp`).
 * 2. Cross-window / Cross-tab focus state broadcasting (Tauri Event + BroadcastChannel dual-mode).
 * 3. Mini-Timer floating window wake/hide controls.
 */

export type FocusSyncPayload = {
  type: "STATE_SYNC" | "ACTION_PAUSE" | "ACTION_RESUME" | "ACTION_STOP" | "ACTION_START";
  activeTaskId?: string | null;
  activeProjectName?: string | null;
  activeTaskTitle?: string | null;
  isRunning?: boolean;
  isPaused?: boolean;
  elapsedSeconds?: number;
};

const SYNC_CHANNEL_NAME = "focusflow:sync";
const TAURI_EVENT_NAME = "focusflow://sync";

let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!broadcastChannel && "BroadcastChannel" in window) {
    try {
      broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

/** Check if current runtime is running inside Tauri desktop shell. */
export function isTauriApp(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
}

/** Broadcast focus event to all windows/tabs via dual channels. */
export async function broadcastFocusSync(payload: FocusSyncPayload): Promise<void> {
  // 1. Web BroadcastChannel (works across all tabs/windows under same origin)
  try {
    const ch = getBroadcastChannel();
    ch?.postMessage(payload);
  } catch {
    // Ignore in unsupported environments
  }

  // 2. Tauri IPC Event broadcast
  if (isTauriApp()) {
    try {
      const { emit } = await import("@tauri-apps/api/event");
      await emit(TAURI_EVENT_NAME, payload);
    } catch {
      // Graceful degradation
    }
  }
}

/** Listen for focus synchronization messages from any window/tab. */
export function subscribeFocusSync(
  handler: (payload: FocusSyncPayload) => void
): () => void {
  let unmounted = false;
  let unlistenTauri: (() => void) | null = null;

  // 1. Listen via Web BroadcastChannel
  const ch = getBroadcastChannel();
  const onWebMessage = (ev: MessageEvent<FocusSyncPayload>) => {
    if (!unmounted && ev.data) {
      handler(ev.data);
    }
  };
  if (ch) {
    ch.addEventListener("message", onWebMessage);
  }

  // 2. Listen via Tauri native events if in Tauri shell
  if (isTauriApp()) {
    void (async () => {
      try {
        const { listen } = await import("@tauri-apps/api/event");
        const unlisten = await listen<FocusSyncPayload>(TAURI_EVENT_NAME, (event) => {
          if (!unmounted && event.payload) {
            handler(event.payload);
          }
        });
        if (unmounted) {
          unlisten();
        } else {
          unlistenTauri = unlisten;
        }
      } catch {
        // Fallback silently
      }
    })();
  }

  return () => {
    unmounted = true;
    if (ch) {
      ch.removeEventListener("message", onWebMessage);
    }
    if (unlistenTauri) {
      unlistenTauri();
    }
  };
}

/** Open or show the floating mini timer window. */
export async function showMiniTimerWindow(): Promise<boolean> {
  if (isTauriApp()) {
    try {
      const { getAllWebviewWindows } = await import("@tauri-apps/api/webviewWindow");
      const windows = await getAllWebviewWindows();
      const mini = windows.find((w) => w.label === "mini-timer");
      if (mini) {
        await mini.show();
        await mini.setFocus();
        await mini.setAlwaysOnTop(true);
        return true;
      }
    } catch {
      // Fallback
    }
  }

  // Browser fallback: open small popup window
  if (typeof window !== "undefined") {
    const w = 340;
    const h = 140;
    const left = window.screen.availWidth - w - 24;
    const top = 36;
    const popup = window.open(
      "/mini-timer",
      "FocusFlowMiniTimer",
      `width=${w},height=${h},top=${top},left=${left},status=no,menubar=no,toolbar=no,location=no,resizable=no`
    );
    if (popup) {
      popup.focus();
      return true;
    }
  }

  return false;
}

/** Hide or close the floating mini timer window. */
export async function hideMiniTimerWindow(): Promise<void> {
  if (isTauriApp()) {
    try {
      const { getAllWebviewWindows } = await import("@tauri-apps/api/webviewWindow");
      const windows = await getAllWebviewWindows();
      const mini = windows.find((w) => w.label === "mini-timer");
      if (mini) {
        await mini.hide();
      }
    } catch {
      // Fallback
    }
  }
}
