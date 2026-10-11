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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="space-y-2 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{status}</Badge>
          <h1 className="text-sm font-semibold tracking-wide text-white uppercase font-mono">
            {title}
          </h1>
        </div>
        <p className="text-xs text-zinc-400">
          {description}
        </p>
      </div>

      <Card className="rounded-none border border-zinc-800 bg-black shadow-none">
        <CardHeader>
          <CardTitle>工作区</CardTitle>
          <CardDescription>
            Pro-Tool 视图就绪。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-zinc-400 font-mono">
          {children ?? (
            <p>此区域承载真实数据与交互组件。</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

