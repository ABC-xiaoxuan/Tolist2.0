import { useMemo } from "react";
import { TaskCard } from "./task-card";
import { Task } from "../types";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

interface DayViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  selectedDate: Date;
}

const TIME_SLOTS = ["高优先级", "中优先级", "低优先级", "未设置优先级"] as const;

export function DayView({ tasks, onToggle, onDelete, onEdit, selectedDate }: DayViewProps) {
  const groupedTasks = useMemo(() => ({
    "高优先级": tasks.filter((t) => t.priority === "high"),
    "中优先级": tasks.filter((t) => t.priority === "medium"),
    "低优先级": tasks.filter((t) => t.priority === "low"),
    "未设置优先级": tasks.filter((t) => !t.priority),
  }), [tasks]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base">{format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })}</h2>
        <div className="text-[13px] text-muted-foreground">
          共 {tasks.length} 个任务
        </div>
      </div>

      {TIME_SLOTS.map((slot, idx) => {
        const slotTasks = groupedTasks[slot];
        return (
          <div
            key={slot}
            className="animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDelay: `${idx * 35}ms` }}
          >
            <div className="mb-1 flex items-center gap-1.5">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
              <h3 className="text-xs text-muted-foreground">{slot}</h3>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-1 pl-2">
              {slotTasks.length > 0 ? (
                slotTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onDelete={onDelete}
                    onEdit={onEdit}
                  />
                ))
              ) : (
                <div className="py-1 text-center text-xs italic text-muted-foreground">
                  暂无任务
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
