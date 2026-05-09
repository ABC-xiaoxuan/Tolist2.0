import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Task, TaskDraft, TaskPriority } from "../types";

const COLORS = [
  { name: "coral", hex: "#FF6B6B" },
  { name: "teal", hex: "#26C6DA" },
  { name: "yellow", hex: "#FFF59D" },
  { name: "purple", hex: "#A78BFA" },
  { name: "orange", hex: "#FB923C" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "high", label: "高优先级" },
  { value: "medium", label: "中优先级" },
  { value: "low", label: "低优先级" },
];

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface TaskModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  initialDate: Date;
  task?: Task | null;
  onClose: () => void;
  onSubmit: (task: TaskDraft) => void | Promise<void>;
}

export function TaskModal({
  isOpen,
  mode,
  initialDate,
  task,
  onClose,
  onSubmit,
}: TaskModalProps) {
  const defaultColor = useMemo(() => COLORS[0], []);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(formatInputDate(initialDate));
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [showAdvanced, setShowAdvanced] = useState(mode === "edit");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === "edit" && task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setCategory(task.category ?? "");
      setDate(formatInputDate(task.date));
      setPriority(task.priority ?? "medium");
      setShowAdvanced(true);
      setSelectedColor({
        name: task.color,
        hex: task.colorHex,
      });
      return;
    }

    setTitle("");
    setDescription("");
    setCategory("");
    setDate(formatInputDate(initialDate));
    setPriority("medium");
    setShowAdvanced(false);
    setSelectedColor(defaultColor);
  }, [defaultColor, initialDate, isOpen, mode, task]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    await onSubmit({
      title,
      description,
      category,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      date,
      priority,
    });

    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
      />

      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(680px,calc(100vh-40px))] w-[min(520px,calc(100vw-28px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-lg">{mode === "create" ? "新建任务" : "编辑任务"}</h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1 transition-all hover:rotate-90 hover:scale-110 hover:bg-muted active:scale-95"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 py-3">
              <div className="space-y-3.5">
              {mode === "create" && (
                <div className="rounded-lg border border-border bg-muted/35 px-3 py-2.5 text-[13px] text-muted-foreground">
                  将创建到当前选中日期：<span className="text-foreground">{date}</span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm">任务标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="输入任务标题..."
                  className="w-full rounded-lg border border-border px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm">描述（可选）</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="添加任务描述..."
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="rounded-xl border border-border bg-background/60">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((value) => !value)}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm"
                >
                  <span>高级选项</span>
                  {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {showAdvanced && (
                  <div className="space-y-3.5 border-t border-border px-3.5 py-3.5">
                    {mode === "edit" && (
                      <div>
                        <label className="mb-1.5 block text-sm">日期</label>
                        <input
                          type="date"
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-sm">分类</label>
                        <input
                          type="text"
                          value={category}
                          onChange={(event) => setCategory(event.target.value)}
                          placeholder="工作/学习/生活"
                          className="w-full rounded-lg border border-border px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm">优先级</label>
                        <select
                          value={priority}
                          onChange={(event) => setPriority(event.target.value as TaskPriority)}
                          className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {PRIORITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm">颜色标签</label>
                      <div className="flex gap-2">
                        {COLORS.map((color) => (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={`h-8 w-8 rounded-full transition-all hover:scale-110 active:scale-95 ${
                              selectedColor.name === color.name ? "ring-4 ring-offset-2" : ""
                            }`}
                            style={{
                              backgroundColor: color.hex,
                              ringColor: color.hex,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

                <button
                  type="submit"
                  className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm text-primary-foreground transition-all hover:scale-[1.02] hover:opacity-90 active:scale-[0.98]"
                >
                  {mode === "create" ? "创建任务" : "保存修改"}
                </button>
              </div>
            </form>
      </div>
    </>
  );
}
