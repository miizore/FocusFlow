'use server';

import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getProjects() {
  try {
    const allProjects = await db.select().from(projects).orderBy(projects.createdAt);
    return { success: true, data: allProjects };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createProject(data: {
  name: string;
  type?: 'general' | 'book' | 'course';
  targetUnits?: number;
}) {
  try {
    const [newProject] = await db
      .insert(projects)
      .values({
        name: data.name,
        type: data.type || 'general',
        targetUnits: data.targetUnits || 0,
        currentUnits: 0,
      })
      .returning();

    revalidatePath('/');
    revalidatePath('/projects');
    return { success: true, data: newProject };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProjectProgress(id: string, currentUnits: number) {
  try {
    const [updated] = await db
      .update(projects)
      .set({ currentUnits })
      .where(eq(projects.id, id))
      .returning();

    revalidatePath('/');
    revalidatePath('/projects');
    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProject(id: string) {
  try {
    await db.delete(projects).where(eq(projects.id, id));
    revalidatePath('/');
    revalidatePath('/projects');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
