import Link from "next/link";
import { ArrowRight, BarChart3, FolderKanban, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MODULES = [
  {
    href: "/projects",
    title: "Projects & Tasks",
    description: "项目分类、书籍/网课进度与每日待办流转。",
    icon: FolderKanban,
  },
  {
    href: "/focus",
    title: "Focus & Timeline",
    description: "正计时、碎片过滤、幽灵截断与手动补录冲突检测。",
    icon: Timer,
  },
  {
    href: "/analytics",
    title: "Analytics",
    description: "月视图任务分布与近 14 天专注趋势。",
    icon: BarChart3,
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <section className="space-y-4">
        <p className="text-sm tracking-[0.2em] text-klein uppercase">
          FocusFlow
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance">
          以时间流为绝对核心的个人管理系统
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Phase 3.1：深色主题、克莱因蓝强调色与毛玻璃 App
          Shell 已就绪。接下来接入鉴权与三大业务视图。
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button asChild>
            <Link href="/projects">
              进入项目流
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/focus">打开专注引擎</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="group">
              <Card className="h-full border-0 bg-card/60 shadow-xl shadow-black/30 ring-1 ring-white/10 backdrop-blur-xl transition-colors group-hover:ring-klein/50">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-klein/20 text-blue-300">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">
                    打开模块 →
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
