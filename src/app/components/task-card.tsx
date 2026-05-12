import { memo } from "react";
import { Bell, Check, Pencil, Trash2 } from "lucide-react";
import { formatReminderText, REMINDER_MODE_LABELS } from "../reminders";
import { Task } from "../types";

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export const TaskCard = memo(function TaskCard({ task, onToggle, onDelete, onEdit }: TaskCardProps) {
  const indicatorColor = "var(--primary)";
  const dueLabel = formatReminderText(task.dueAt);
  const reminderLabel = formatReminderText(task.reminderAt);

  return (
    <div
      className={`select-none cursor-pointer rounded-lg border bg-white px-3 py-2.5 shadow-sm transition-all hover:scale-[1.01] hover:shadow-md ${
        task.delayed ? "border-orange/45" : "border-border"
      }`}
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation();
            onToggle(task.id);
          }}
          className="flex h-5.5 w-5.5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all active:scale-90"
          style={{
            backgroundColor: task.completed ? indicatorColor : "white",
            borderColor: indicatorColor,
          }}
        >
          {task.completed && <Check className="h-3.5 w-3.5 text-white" />}
        </button>

        <div className="min-w-0 flex-1">
          <h3
            className={`text-[15px] leading-5 transition-all ${
              task.completed
                ? "line-through opacity-50"
                : ""
            }`}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
              {task.description}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {task.delayed && (
              <span className="rounded-full bg-orange/15 px-1.5 py-0.5 text-[11px] text-orange">
                延迟任务
              </span>
            )}
            {task.category && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[11px]"
                style={{ backgroundColor: `${task.colorHex}20`, color: task.colorHex }}
              >
                {task.category}
              </span>
            )}
            {dueLabel && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500">
                到期 {dueLabel}
              </span>
            )}
            {reminderLabel && !task.completed && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-1.5 py-0.5 text-[11px] text-primary">
                <Bell className="h-3 w-3" />
                {REMINDER_MODE_LABELS[task.reminderMode]} · {reminderLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onEdit(task);
            }}
            className="rounded-md p-1 text-muted-foreground transition-all hover:scale-110 hover:bg-primary/10 hover:text-primary active:scale-95"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(task.id);
            }}
            className="rounded-md p-1 text-muted-foreground transition-all hover:scale-110 hover:bg-destructive/10 hover:text-destructive active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});
