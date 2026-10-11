import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function SectionPlaceholder({
  title,
  description,
  status = "骨架就绪",
  children,
}: {
  title: string;
  description: string;
  status?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="space-y-3">
        <Badge
          variant="secondary"
          className="border border-white/10 bg-white/5 text-muted-foreground backdrop-blur"
        >
          {status}
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <Card className="border-0 bg-card/70 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>工作区</CardTitle>
          <CardDescription>
            Phase 3.1 已完成壳层与主题；业务交互将在后续步骤接入。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {children ?? (
            <p>此区域将承载真实数据与交互组件。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
