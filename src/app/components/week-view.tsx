import { TaskCard } from "./task-card";
import { Task } from "../types";
import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

interface WeekViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateOpen: (date: Date) => void;
}

export function WeekView({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  selectedDate,
  onDateSelect,
  onDateOpen,
}: WeekViewProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(task.date, day));
  };

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg">
          {format(weekStart, "M月d日", { locale: zhCN })} - {format(addDays(weekStart, 6), "M月d日", { locale: zhCN })}
        </h2>
        <div className="text-sm text-muted-foreground">
          共 {tasks.length} 个任务
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, idx) => {
          const dayTasks = getTasksForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              style={{ animationDelay: `${idx * 20}ms` }}
              onClick={() => {
                onDateSelect(day);
                onDateOpen(day);
              }}
              className={`animate-in fade-in zoom-in-95 cursor-pointer rounded-xl p-2.5 transition-all hover:-translate-y-0.5 ${
                isSelected
                  ? "border-2 border-primary bg-primary/10"
                  : isToday
                    ? "border-2 border-primary/50 bg-primary/5"
                    : "border border-border bg-white hover:bg-muted/40"
              }`}
            >
              <div className="mb-2 text-center">
                <div className="text-xs text-muted-foreground">
                  {format(day, "EEE", { locale: zhCN })}
                </div>
                <div className={`mt-0.5 text-base ${isSelected || isToday ? "text-primary" : ""}`}>
                  {format(day, "d")}
                </div>
              </div>

              <div className="space-y-1.5">
                {dayTasks.map((task) => (
                  <button
                    key={task.id}
                    className="w-full rounded-lg border border-border bg-background p-1.5 text-left text-xs transition-transform hover:scale-[1.02]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <div
                        className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: task.colorHex }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`line-clamp-2 ${task.completed ? "line-through opacity-50" : ""}`}>
                          {task.title}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {dayTasks.length === 0 && (
                  <div className="py-1.5 text-center text-xs text-muted-foreground">
                    无任务
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
