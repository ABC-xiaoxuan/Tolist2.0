import { ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "../types";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, format, isSameMonth, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";

interface MonthViewProps {
  tasks: Task[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDateOpen: (date: Date) => void;
}

export function MonthView({ tasks, selectedDate, onDateSelect, onDateOpen }: MonthViewProps) {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(task.date, day));
  };

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
            const dayTasks = getTasksForDay(day);
            const isCurrentMonth = isSameMonth(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isSelected = isSameDay(day, selectedDate);

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
                        style={{ backgroundColor: task.colorHex }}
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
}
