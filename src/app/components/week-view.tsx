import { memo, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "../types";
import { startOfWeek, addDays, addWeeks, subWeeks, format } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

interface WeekViewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateOpen: (date: Date) => void;
  onWeekChange: (date: Date) => void;
}

export const WeekView = memo(function WeekView({
  tasks,
  onToggle,
  onDelete,
  onEdit,
  selectedDate,
  onDateSelect,
  onDateOpen,
  onWeekChange,
}: WeekViewProps) {
  const indicatorColor = "var(--primary)";
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const tasksByDay = useMemo(() => {
    const groupedTasks = new Map<string, Task[]>();

    for (const task of tasks) {
      const taskDateKey = format(task.date, "yyyy-MM-dd");
      const dayTasks = groupedTasks.get(taskDateKey);

      if (dayTasks) {
        dayTasks.push(task);
      } else {
        groupedTasks.set(taskDateKey, [task]);
      }
    }

    return groupedTasks;
  }, [tasks]);
  const goToPreviousWeek = () => onWeekChange(subWeeks(weekStart, 1));
  const goToNextWeek = () => onWeekChange(addWeeks(weekStart, 1));
  const goToCurrentWeek = () => onWeekChange(new Date());

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="rounded-lg border border-border bg-white p-1.5 text-muted-foreground transition-all hover:scale-105 hover:bg-muted hover:text-foreground active:scale-95"
            title="上一周"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <h2 className="min-w-[180px] text-center text-lg">
            {format(weekStart, "M月d日", { locale: zhCN })} - {format(addDays(weekStart, 6), "M月d日", { locale: zhCN })}
          </h2>

          <button
            onClick={goToNextWeek}
            className="rounded-lg border border-border bg-white p-1.5 text-muted-foreground transition-all hover:scale-105 hover:bg-muted hover:text-foreground active:scale-95"
            title="下一周"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToCurrentWeek}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            本周
          </button>
          <div className="text-sm text-muted-foreground">
            共 {tasks.length} 个任务
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day, idx) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDay.get(dayKey) ?? [];
          const isToday = dayKey === todayKey;
          const isSelected = dayKey === selectedDateKey;

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
                    className="w-full select-none rounded-lg border border-border bg-background p-1.5 text-left text-xs transition-transform hover:scale-[1.02]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit(task);
                    }}
                  >
                    <div className="flex items-start gap-1.5">
                      <div
                        className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: indicatorColor }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className={`line-clamp-2 ${task.completed ? "line-through opacity-50" : ""}`}>
                          {task.title}
                        </div>
                        {task.delayed && (
                          <div className="mt-0.5 inline-flex rounded-full bg-orange/15 px-1.5 py-0.5 text-[10px] leading-none text-orange">
                            延迟
                          </div>
                        )}
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
});
