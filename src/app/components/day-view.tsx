import { memo } from "react";
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

export const DayView = memo(function DayView({ tasks, onToggle, onDelete, onEdit, selectedDate }: DayViewProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-base">{format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })}</h2>
        <div className="text-[13px] text-muted-foreground">
          共 {tasks.length} 个任务
        </div>
      </div>

      <div className="space-y-1.5">
        {tasks.length > 0 ? (
          tasks.map((task, idx) => (
            <div
              key={task.id}
              className="animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${idx * 35}ms` }}
            >
              <TaskCard
                task={task}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-white px-4 py-6 text-center text-sm text-muted-foreground">
            这一天还没有待办任务
          </div>
        )}
      </div>
    </div>
  );
});
