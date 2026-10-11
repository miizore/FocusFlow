"use client";

import { useActionState } from "react";
import { loginWithPassphrase, type AuthActionState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = { success: false };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginWithPassphrase,
    initialState
  );

  return (
    <div className="relative flex min-h-full flex-1 items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute left-1/2 top-0 size-[28rem] -translate-x-1/2 rounded-full bg-klein/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 size-[18rem] rounded-full bg-blue-950/40 blur-3xl" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-0 bg-card/70 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <p className="text-sm tracking-[0.2em] text-klein uppercase">
            FocusFlow
          </p>
          <CardTitle className="text-2xl">进入工作区</CardTitle>
          <CardDescription>
            单用户模式：输入管理员口令以继续。口令由环境变量{" "}
            <code className="text-foreground/80">ADMIN_PASSPHRASE</code>{" "}
            配置。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="passphrase">口令</Label>
              <Input
                id="passphrase"
                name="passphrase"
                type="password"
                autoComplete="current-password"
                placeholder="输入 ADMIN_PASSPHRASE"
                required
                disabled={pending}
              />
            </div>

            {state.error ? (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "验证中…" : "进入 FocusFlow"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
