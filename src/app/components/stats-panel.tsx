import { memo } from "react";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";
import type { MascotReaction } from "../types";
import { CompletionPieChart } from "./charts/completion-pie-chart";
import { MascotPet } from "./mascot-pet";

interface StatsPanelProps {
  completedCount: number;
  totalCount: number;
  delayedCount: number;
  mascotReaction: MascotReaction;
}

export const StatsPanel = memo(function StatsPanel({
  completedCount,
  totalCount,
  delayedCount,
  mascotReaction,
}: StatsPanelProps) {
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const pendingCount = Math.max(totalCount - completedCount, 0);
  const focusLabel =
    totalCount === 0
      ? "还没有任务"
      : pendingCount === 0
        ? "今天已全部完成"
        : `还有 ${pendingCount} 项待完成`;

  return (
    <div className="flex h-full w-full bg-white">
      <div className="flex h-full w-full flex-col p-2.5">
        <div>
          <h2 className="mb-2 text-sm">统计概览</h2>

          <div className="mb-2.5 grid grid-cols-2 gap-1.5">
            <div className="rounded-lg border border-coral/20 bg-coral/10 p-2 transition-transform hover:scale-105">
              <CheckCircle2 className="mb-1 h-4 w-4 text-coral" />
              <div className="text-base leading-none text-coral">{completedCount}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">已完成</div>
            </div>

            <div className="rounded-lg border border-teal/20 bg-teal/10 p-2 transition-transform hover:scale-105">
              <Clock className="mb-1 h-4 w-4 text-teal" />
              <div className="text-base leading-none text-teal">{pendingCount}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">进行中</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="rounded-lg border border-border/70 bg-muted/35 p-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>当前进度</span>
              <span>{completionRate}%</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-foreground/80">{focusLabel}</div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg bg-primary/8 p-1.5">
              <div className="whitespace-nowrap text-[10px] text-muted-foreground">任务总数</div>
              <div className="mt-1 text-sm leading-none text-primary">{totalCount}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-1.5">
              <div className="whitespace-nowrap text-[10px] text-muted-foreground">待完成</div>
              <div className="mt-1 text-sm leading-none text-emerald-600">{pendingCount}</div>
            </div>
            <div className="rounded-lg bg-orange/12 p-1.5">
              <div className="whitespace-nowrap text-[10px] text-muted-foreground">延迟任务</div>
              <div className="mt-1 text-sm leading-none text-orange">{delayedCount}</div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full rounded-lg border border-yellow/40 bg-yellow/20 p-2 transition-transform hover:scale-[1.02]">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[13px]">完成率</span>
              <TrendingUp className="h-3.5 w-3.5 text-orange" />
            </div>
            <div className="mb-0.5 flex items-center justify-center">
              <CompletionPieChart completedCount={completedCount} totalCount={totalCount} />
            </div>
            <div className="text-center text-base text-coral">{completionRate}%</div>
          </div>
          <div className="mt-2">
            <MascotPet completionRate={completionRate} reaction={mascotReaction} />
          </div>
        </div>
      </div>
    </div>
  );
});
