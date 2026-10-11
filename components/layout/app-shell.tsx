"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FolderKanban,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/projects",
    label: "Projects",
    description: "项目与待办流",
    icon: FolderKanban,
  },
  {
    href: "/focus",
    label: "Focus",
    description: "计时器与时间轴",
    icon: Timer,
  },
  {
    href: "/analytics",
    label: "Analytics",
    description: "日历与趋势",
    icon: BarChart3,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative flex min-h-full flex-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-32 top-0 size-[28rem] rounded-full bg-klein/20 blur-3xl" />
        <div className="absolute -right-24 bottom-0 size-[22rem] rounded-full bg-blue-900/30 blur-3xl" />
      </div>

      <aside className="relative z-10 flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl">
        <div className="px-5 py-6">
          <Link href="/" className="group block space-y-1">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              FocusFlow
            </p>
            <p className="text-xs text-muted-foreground transition-colors group-hover:text-foreground/80">
              时间流 · 个人管理系统
            </p>
          </Link>
        </div>

        <Separator className="opacity-40" />

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-start gap-3 rounded-xl px-3 py-3 transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-klein/30"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    active ? "opacity-100" : "opacity-70"
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-none">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-xs leading-snug",
                      active
                        ? "text-sidebar-primary-foreground/75"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-3 border-t border-sidebar-border p-4">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Dark · Klein Blue · Timeline-first
          </p>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              退出登录
            </Button>
          </form>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-white/5 bg-background/60 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                FocusFlow
              </p>
              <p className="text-sm text-foreground/90">
                所有功能收敛于专注时间轴
              </p>
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <span className="size-2 rounded-full bg-klein" />
              <span className="text-xs text-muted-foreground">
                Phase 3 · Web Ready
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
