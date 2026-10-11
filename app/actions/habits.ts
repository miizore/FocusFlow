'use server';

import { db } from '@/db';
import { habits, habitLogs } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getHabits() {
  try {
    const allHabits = await db.select().from(habits).orderBy(habits.createdAt);
    return { success: true, data: allHabits };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createHabit(name: string) {
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: '习惯名称不能为空' };
    }

    const [newHabit] = await db
      .insert(habits)
      .values({ name: trimmed })
      .returning();

    revalidatePath('/habits');
    return { success: true, data: newHabit };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteHabit(id: string) {
  try {
    await db.delete(habits).where(eq(habits.id, id));
    revalidatePath('/habits');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getHabitLogsForDates(dates: string[]) {
  try {
    if (dates.length === 0) {
      return { success: true, data: [] };
    }
    const logs = await db
      .select()
      .from(habitLogs)
      .where(inArray(habitLogs.date, dates));

    return { success: true, data: logs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleHabitLog(habitId: string, date: string, completed: boolean) {
  try {
    const [existing] = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)));

    if (existing) {
      const [updated] = await db
        .update(habitLogs)
        .set({ completed })
        .where(eq(habitLogs.id, existing.id))
        .returning();
      revalidatePath('/habits');
      return { success: true, data: updated };
    }

    const [inserted] = await db
      .insert(habitLogs)
      .values({
        habitId,
        date,
        completed,
      })
      .returning();

    revalidatePath('/habits');
    return { success: true, data: inserted };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
