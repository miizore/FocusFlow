"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  FolderKanban,
  LogOut,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS: {
  href: string;
  label: string;
  code: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/projects",
    label: "Projects",
    code: "PRJ",
    icon: FolderKanban,
  },
  {
    href: "/focus",
    label: "Focus",
    code: "FOC",
    icon: Timer,
  },
  {
    href: "/habits",
    label: "Habits",
    code: "HBT",
    icon: CheckSquare,
  },
  {
    href: "/analytics",
    label: "Analytics",
    code: "ANA",
    icon: BarChart3,
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-black text-zinc-100 select-none">
      {/* Pane 1: Ultra-narrow Icon Nav Bar (w-16, border-r border-zinc-800 bg-black) */}
      <aside className="flex w-16 shrink-0 flex-col justify-between border-r border-zinc-800 bg-black py-3">
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/"
            title="FocusFlow Command Center"
            className="group flex size-10 items-center justify-center border border-zinc-800 bg-zinc-950 hover:border-[#002FA7] transition-colors"
          >
            <span className="font-mono text-sm font-bold tracking-tight text-white group-hover:text-blue-400">
              FF
            </span>
          </Link>

          <nav className="flex flex-col items-center gap-1.5 w-full px-2">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={`${item.label} (${item.code})`}
                  className={cn(
                    "flex size-11 w-full flex-col items-center justify-center gap-0.5 border text-center transition-colors",
                    active
                      ? "border-[#002FA7] bg-[#002FA7]/20 text-white"
                      : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="font-mono text-[9px] uppercase tracking-wider scale-90">
                    {item.code}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-2 px-2">
          <form action={logout} className="w-full">
            <button
              type="submit"
              title="退出登录"
              className="flex size-11 w-full flex-col items-center justify-center border border-transparent text-zinc-500 hover:border-[#BC0C0C] hover:bg-zinc-950 hover:text-[#BC0C0C] transition-colors cursor-pointer"
            >
              <LogOut className="size-4 shrink-0" />
              <span className="font-mono text-[9px] scale-90 uppercase">OUT</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Container: No card floating, direct border grid */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-black">
        {/* Top Minimal Bar */}
        <header className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800 bg-black px-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-white tracking-wider uppercase">
              FOCUSFLOW // COMMAND CENTER
            </span>
            <span className="text-zinc-700">|</span>
            <span className="font-mono text-[11px] text-zinc-400">
              {pathname}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="size-1.5 bg-[#002FA7]" />
            <span className="font-mono text-[11px] text-zinc-500 uppercase">
              SYSTEM ONLINE
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto bg-black p-0 select-text">
          {children}
        </main>
      </div>
    </div>
  );
}


