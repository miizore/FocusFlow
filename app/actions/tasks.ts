'use server';

import { db } from '@/db';
import { tasks, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getTasks(projectId?: string) {
  try {
    let query = db.select().from(tasks);
    if (projectId) {
      query = db.select().from(tasks).where(eq(tasks.projectId, projectId)) as any;
    }
    const allTasks = await query.orderBy(tasks.createdAt);
    return { success: true, data: allTasks };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createTask(data: {
  projectId: string;
  title: string;
  plannedDate?: string;
}) {
  try {
    const [newTask] = await db
      .insert(tasks)
      .values({
        projectId: data.projectId,
        title: data.title,
        status: 'todo',
        plannedDate: data.plannedDate || null,
      })
      .returning();

    revalidatePath('/');
    revalidatePath('/projects');
    revalidatePath('/focus');
    return { success: true, data: newTask };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateTaskStatus(id: string, status: 'todo' | 'in_progress' | 'done') {
  try {
    const [existingTask] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!existingTask) {
      return { success: false, error: 'Task not found' };
    }

    const wasNotDone = existingTask.status !== 'done';
    const isNowDone = status === 'done';

    const [updatedTask] = await db
      .update(tasks)
      .set({ status })
      .where(eq(tasks.id, id))
      .returning();

    if (wasNotDone && isNowDone) {
      const [project] = await db.select().from(projects).where(eq(projects.id, existingTask.projectId));
      if (project && (project.type === 'book' || project.type === 'course')) {
        const newCurrentUnits = Math.min(project.targetUnits, project.currentUnits + 1);
        await db
          .update(projects)
          .set({ currentUnits: newCurrentUnits })
          .where(eq(projects.id, project.id));
      }
    }

    revalidatePath('/');
    revalidatePath('/projects');
    revalidatePath('/focus');
    revalidatePath('/analytics');
    return { success: true, data: updatedTask };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTask(id: string) {
  try {
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidatePath('/');
    revalidatePath('/projects');
    revalidatePath('/focus');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
