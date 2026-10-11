'use server';

import { db } from '@/db';
import { focusSessions, tasks, projects } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import {
  evaluateTimedSession,
  findOverlappingSession,
  MIN_FOCUS_SECONDS,
} from '@/lib/focus-rules';

function revalidateFocusPaths() {
  revalidatePath('/');
  revalidatePath('/focus');
  revalidatePath('/analytics');
}

export async function recordFocusSession(data: {
  taskId: string;
  startedAt: Date | string;
  endedAt: Date | string;
}) {
  try {
    const started = new Date(data.startedAt);
    const evaluation = evaluateTimedSession(started, data.endedAt);

    if (!evaluation.ok) {
      return {
        success: false,
        rejected: true,
        reason: evaluation.reason,
      };
    }

    const [newSession] = await db
      .insert(focusSessions)
      .values({
        taskId: data.taskId,
        startedAt: started,
        endedAt: evaluation.endedAt,
        duration: evaluation.duration,
        isManual: false,
      })
      .returning();

    revalidateFocusPaths();
    return {
      success: true,
      truncated: evaluation.truncated,
      data: newSession,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function manualAddFocusSession(data: {
  taskId: string;
  startedAt: Date | string;
  endedAt: Date | string;
}) {
  try {
    const started = new Date(data.startedAt);
    const ended = new Date(data.endedAt);
    const duration = Math.floor((ended.getTime() - started.getTime()) / 1000);

    if (Number.isNaN(started.getTime()) || Number.isNaN(ended.getTime())) {
      return { success: false, error: '时间格式无效' };
    }

    if (duration <= 0) {
      return { success: false, error: '结束时间必须大于开始时间' };
    }

    if (duration < MIN_FOCUS_SECONDS) {
      return { success: false, error: '手动补录时间不能少于 5 分钟' };
    }

    // Rule 3: Collision detection (Overlapping check)
    const existingSessions = await db.select().from(focusSessions);
    const overlap = findOverlappingSession(
      { startedAt: started, endedAt: ended },
      existingSessions
    );
    if (overlap) {
      return {
        success: false,
        error: '时间冲突检测失败：该时间段与已有专注记录存在重叠 (Overlap)',
      };
    }

    const [newSession] = await db
      .insert(focusSessions)
      .values({
        taskId: data.taskId,
        startedAt: started,
        endedAt: ended,
        duration,
        isManual: true,
      })
      .returning();

    revalidateFocusPaths();
    return { success: true, data: newSession };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFocusSessions() {
  try {
    const sessions = await db
      .select()
      .from(focusSessions)
      .orderBy(desc(focusSessions.startedAt));
    return { success: true, data: sessions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export type FocusTimelineItem = {
  id: string;
  taskId: string;
  startedAt: Date;
  endedAt: Date;
  duration: number;
  isManual: boolean;
  taskTitle: string;
  projectName: string;
};

export async function getFocusTimeline() {
  try {
    const sessions = await db
      .select({
        id: focusSessions.id,
        taskId: focusSessions.taskId,
        startedAt: focusSessions.startedAt,
        endedAt: focusSessions.endedAt,
        duration: focusSessions.duration,
        isManual: focusSessions.isManual,
        taskTitle: tasks.title,
        projectName: projects.name,
      })
      .from(focusSessions)
      .innerJoin(tasks, eq(focusSessions.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .orderBy(desc(focusSessions.startedAt));

    return { success: true, data: sessions };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
