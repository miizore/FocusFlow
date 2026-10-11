import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, isValidSessionToken } from "@/lib/auth";
import { recordFocusSession } from "@/app/actions/focus";

/**
 * Keepalive-friendly settle endpoint for beforeunload / pagehide.
 * Mirrors recordFocusSession rules (fragment filter + ghost truncation).
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!(await isValidSessionToken(token))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    taskId?: string;
    startedAt?: string;
    endedAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.taskId || !body.startedAt || !body.endedAt) {
    return NextResponse.json(
      { success: false, error: "Missing taskId/startedAt/endedAt" },
      { status: 400 }
    );
  }

  const result = await recordFocusSession({
    taskId: body.taskId,
    startedAt: body.startedAt,
    endedAt: body.endedAt,
  });

  return NextResponse.json(result, {
    status: result.success ? 200 : result.rejected ? 422 : 400,
  });
}
