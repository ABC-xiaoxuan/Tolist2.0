import { ArchiveRestore, Database, Download, Palette, RefreshCw, Trash2, Wand2, X } from "lucide-react";

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportJson: () => void | Promise<void>;
  onBackupDatabase: () => void | Promise<void>;
  onClearAll: () => void | Promise<void>;
  onSeedExampleTasks: () => void | Promise<void>;
  onCheckUpdates: () => void | Promise<void>;
  mainThemeColor: string;
  onMainThemeColorChange: (color: string) => void;
  isCheckingUpdates: boolean;
  taskCount: number;
}

export function ToolsModal({
  isOpen,
  onClose,
  onExportJson,
  onBackupDatabase,
  onClearAll,
  onSeedExampleTasks,
  onCheckUpdates,
  mainThemeColor,
  onMainThemeColorChange,
  isCheckingUpdates,
  taskCount,
}: ToolsModalProps) {
  const mainColorPresets = ["#FF6B6B", "#2563EB", "#14B8A6", "#F97316", "#8B5CF6", "#10B981"];
  const actions = [
    {
      title: isCheckingUpdates ? "正在检查更新" : "检查在线更新",
      description: "从 GitHub Releases 获取最新版本，发现更新后可自动下载安装。",
      icon: RefreshCw,
      action: onCheckUpdates,
      disabled: isCheckingUpdates,
    },
    {
      title: "导出任务 JSON",
      description: "把当前全部任务导出成 JSON 文件，方便备份或迁移。",
      icon: Download,
      action: onExportJson,
    },
    {
      title: "备份 SQLite 数据库",
      description: "复制当前本地数据库文件，适合做完整冷备份。",
      icon: Database,
      action: onBackupDatabase,
    },
    {
      title: "载入示例任务",
      description: "在空白列表里快速注入一组演示数据，便于体验完整界面。",
      icon: Wand2,
      action: onSeedExampleTasks,
    },
    {
      title: "清空全部任务",
      description: "删除数据库中的全部任务记录。这个操作不可撤销。",
      icon: Trash2,
      action: onClearAll,
      destructive: true,
    },
  ];

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
      />

      <div className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(680px,calc(100vh-40px))] w-[min(640px,calc(100vw-28px))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-3">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h2 className="text-lg">数据工具</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  当前数据库共有 {taskCount} 条任务记录。
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
              <div className="grid gap-3 md:grid-cols-2">
                {actions.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      onClick={() => void item.action()}
                      disabled={item.disabled}
                      className={`rounded-xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        item.destructive
                          ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                          : "border-border bg-background hover:bg-white"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      <div className="mb-3 flex items-center gap-2.5">
                        <div
                          className={`rounded-lg p-2 ${
                            item.destructive ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                          }`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${isCheckingUpdates && item.title.includes("正在检查") ? "animate-spin" : ""}`} />
                        </div>
                        <span className="text-[15px]">{item.title}</span>
                      </div>
                      <p className="text-[13px] leading-5 text-muted-foreground">{item.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <Palette className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-[15px]">主程序主题色</h3>
                    <p className="text-[13px] text-muted-foreground">
                      调整主窗口按钮、高亮和强调色。
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {mainColorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => onMainThemeColorChange(color)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-105 active:scale-95 ${
                        mainThemeColor.toLowerCase() === color.toLowerCase() ? "border-foreground/70" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                      aria-label={`切换主题色 ${color}`}
                    />
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="color"
                    value={mainThemeColor}
                    onChange={(event) => onMainThemeColorChange(event.target.value)}
                    className="h-9 w-11 cursor-pointer rounded-lg border border-border bg-transparent p-1"
                    title="选择任意主题色"
                  />
                  <input
                    type="text"
                    value={mainThemeColor}
                    onChange={(event) => onMainThemeColorChange(event.target.value)}
                    className="h-9 flex-1 rounded-lg border border-border bg-white px-3 text-[13px] outline-none focus:ring-2 focus:ring-primary"
                    placeholder="#FF6B6B"
                    maxLength={7}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3.5 py-2.5 text-[13px] text-muted-foreground">
                <ArchiveRestore className="h-4 w-4" />
                数据导出和数据库备份都会保留当前本地内容，不会影响现有任务。
              </div>
            </div>
      </div>
    </>
  );
}
