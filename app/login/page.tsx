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
import { Shield } from "lucide-react";

const initialState: AuthActionState = { success: false };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    loginWithPassphrase,
    initialState
  );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-black p-4 text-zinc-100">
      <Card className="w-full max-w-sm rounded-none border border-zinc-800 bg-black p-2 shadow-none">
        <CardHeader className="space-y-2 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center border border-blue-600 bg-blue-600/20 text-blue-500">
              <Shield className="size-3.5" />
            </span>
            <span className="font-mono text-xs font-semibold tracking-wider text-white uppercase">
              FocusFlow Auth
            </span>
          </div>
          <CardTitle className="text-sm font-semibold tracking-wide text-white">
            管理员鉴权
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            单用户模式：输入系统管理员口令 ADMIN_PASSPHRASE
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="passphrase" className="text-xs font-mono uppercase text-zinc-400">
                PASSPHRASE
              </Label>
              <Input
                id="passphrase"
                name="passphrase"
                type="password"
                autoComplete="current-password"
                placeholder="输入管理员口令"
                required
                disabled={pending}
                className="rounded-none border-zinc-800 bg-zinc-950 font-mono text-xs"
              />
            </div>

            {state.error ? (
              <div
                className="border border-red-900 bg-red-950/60 px-3 py-2 text-xs font-mono text-red-400"
                role="alert"
              >
                {state.error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="w-full rounded-none bg-blue-600 text-xs font-mono uppercase tracking-wider text-white hover:bg-blue-500"
              disabled={pending}
            >
              {pending ? "AUTHENTICATING..." : "VERIFY & ENTER"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

