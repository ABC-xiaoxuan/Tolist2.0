import { format } from "date-fns";
import { zhCN } from "date-fns/locale/zh-CN";
import { X } from "lucide-react";
import { Task } from "../types";
import { TaskCard } from "./task-card";

interface DateTasksModalProps {
  isOpen: boolean;
  date: Date | null;
  tasks: Task[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

export function DateTasksModal({
  isOpen,
  date,
  tasks,
  onClose,
  onToggle,
  onDelete,
  onEdit,
}: DateTasksModalProps) {
  if (!isOpen || !date) {
    return null;
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
      />

      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(640px,calc(100vh-40px))] w-[min(500px,calc(100vw-28px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-lg">当日待办</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {format(date, "yyyy年M月d日 EEEE", { locale: zhCN })} · {tasks.length} 项任务
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 transition-all hover:rotate-90 hover:scale-110 hover:bg-muted active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {tasks.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  这一天还没有待办事项
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onEdit={(selectedTask) => {
                        onClose();
                        onEdit(selectedTask);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
      </div>
    </>
  );
}
