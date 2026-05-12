import { memo, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "../types";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, format, isSameMonth } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

interface MonthViewProps {
  tasks: Task[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateOpen: (date: Date) => void;
}

export const MonthView = memo(function MonthView({ tasks, selectedDate, onDateSelect, onDateOpen }: MonthViewProps) {
  const indicatorColor = "var(--primary)";
  const monthStart = useMemo(() => startOfMonth(selectedDate), [selectedDate]);
  const monthEnd = useMemo(() => endOfMonth(selectedDate), [selectedDate]);
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const days = useMemo(() => {
    const calendarDays: Date[] = [];
    let day = calendarStart;

    while (day <= calendarEnd) {
      calendarDays.push(day);
      day = addDays(day, 1);
    }

    return calendarDays;
  }, [calendarEnd, calendarStart]);
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
  const weekDays = ["一", "二", "三", "四", "五", "六", "日"];
  const goToPreviousMonth = () => onDateSelect(subMonths(monthStart, 1));
  const goToNextMonth = () => onDateSelect(addMonths(monthStart, 1));
  const goToCurrentMonth = () => onDateSelect(new Date());

  return (
    <div className="space-y-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="rounded-lg border border-border bg-white p-1.5 text-muted-foreground transition-all hover:scale-105 hover:bg-muted hover:text-foreground active:scale-95"
            title="上个月"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <h2 className="min-w-[112px] text-center text-lg">
            {format(selectedDate, "yyyy年M月", { locale: zhCN })}
          </h2>

          <button
            onClick={goToNextMonth}
            className="rounded-lg border border-border bg-white p-1.5 text-muted-foreground transition-all hover:scale-105 hover:bg-muted hover:text-foreground active:scale-95"
            title="下个月"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToCurrentMonth}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            本月
          </button>
          <div className="text-sm text-muted-foreground">
            共 {tasks.length} 个任务
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-3">
        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => (
            <div key={day} className="py-1.5 text-center text-sm text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, idx) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayTasks = tasksByDay.get(dayKey) ?? [];
            const isCurrentMonth = isSameMonth(day, selectedDate);
            const isToday = dayKey === todayKey;
            const isSelected = dayKey === selectedDateKey;

            return (
              <button
                key={day.toISOString()}
                style={{ animationDelay: `${idx * 5}ms` }}
                onClick={() => {
                  onDateSelect(day);
                  onDateOpen(day);
                }}
                className={`animate-in fade-in zoom-in-95 relative aspect-square rounded-lg p-1.5 transition-all hover:scale-105 active:scale-95 ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                    ? "bg-secondary/20 border-2 border-secondary"
                    : isCurrentMonth
                    ? "bg-background hover:bg-muted"
                    : "bg-muted/50 opacity-50"
                }`}
              >
                <div className="text-sm">{format(day, "d")}</div>

                {dayTasks.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                    {dayTasks.slice(0, 3).map((task, i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: task.delayed ? "#FB923C" : indicatorColor }}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs">+{dayTasks.length - 3}</div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});
