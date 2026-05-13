import { AlertCircle, ArchiveRestore, CheckCircle2, Database, Download, Loader2, Palette, RefreshCw, Trash2, Wand2, X } from "lucide-react";
import type { UpdateProgressPhase, UpdateProgressState } from "../types";

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
  updateProgress: UpdateProgressState;
  taskCount: number;
}

const updatePhaseText: Record<UpdateProgressPhase, string> = {
  idle: "等待检查",
  checking: "检查中",
  available: "发现更新",
  downloading: "下载中",
  installing: "安装中",
  restarting: "重启中",
  done: "已完成",
  error: "更新失败",
};

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function getOverallUpdatePercent(phase: UpdateProgressPhase, downloadPercent: number | null) {
  if (phase === "checking") {
    return 12;
  }

  if (phase === "available") {
    return 22;
  }

  if (phase === "downloading") {
    return downloadPercent === null ? 48 : Math.min(84, 25 + Math.round(downloadPercent * 0.58));
  }

  if (phase === "installing") {
    return 92;
  }

  if (phase === "restarting" || phase === "done" || phase === "error") {
    return 100;
  }

  return 0;
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
  updateProgress,
  taskCount,
}: ToolsModalProps) {
  const mainColorPresets = ["#FF6B6B", "#2563EB", "#14B8A6", "#F97316", "#8B5CF6", "#10B981"];
  const updateTotalBytes = updateProgress.totalBytes && updateProgress.totalBytes > 0 ? updateProgress.totalBytes : undefined;
  const updateDownloadedBytes = Math.min(updateProgress.downloadedBytes, updateTotalBytes ?? updateProgress.downloadedBytes);
  const downloadPercent = updateTotalBytes ? Math.min(100, Math.round((updateDownloadedBytes / updateTotalBytes) * 100)) : null;
  const overallPercent = getOverallUpdatePercent(updateProgress.phase, downloadPercent);
  const isUpdateProgressVisible = updateProgress.phase !== "idle";
  const isUpdateError = updateProgress.phase === "error";
  const isUpdateDone = updateProgress.phase === "done";
  const isUpdateWorking = isCheckingUpdates && !isUpdateError && !isUpdateDone;
  const UpdateStatusIcon = isUpdateError ? AlertCircle : isUpdateDone ? CheckCircle2 : Loader2;
  const downloadProgressText = updateTotalBytes
    ? `${formatBytes(updateDownloadedBytes)} / ${formatBytes(updateTotalBytes)}${downloadPercent === null ? "" : ` (${downloadPercent}%)`}`
    : updateProgress.downloadedBytes > 0
      ? `${formatBytes(updateProgress.downloadedBytes)} 已下载`
      : "准备中";
  const actions = [
    {
      title: isCheckingUpdates ? "更新进行中" : "检查在线更新",
      description: "从 GitHub Releases 获取最新版本，并显示下载与安装进度。",
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
              {isUpdateProgressVisible && (
                <div
                  className={`mb-3 rounded-xl border p-3.5 ${
                    isUpdateError
                      ? "border-destructive/25 bg-destructive/5 text-destructive"
                      : "border-primary/20 bg-primary/5 text-foreground"
                  }`}
                >
                  <div className="mb-3 flex items-start gap-2.5">
                    <div
                      className={`rounded-lg p-2 ${
                        isUpdateError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <UpdateStatusIcon className={`h-4 w-4 ${isUpdateWorking ? "animate-spin" : ""}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[14px] font-medium">{updatePhaseText[updateProgress.phase]}</p>
                        {updateProgress.version && (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                            v{updateProgress.version}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[12px] leading-5 text-muted-foreground">{updateProgress.message}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>下载进度</span>
                        <span>{downloadProgressText}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full bg-primary transition-all duration-300 ${
                            updateProgress.phase === "downloading" && downloadPercent === null ? "w-1/2 animate-pulse" : ""
                          }`}
                          style={downloadPercent === null ? undefined : { width: `${downloadPercent}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>更新进度</span>
                        <span>{overallPercent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isUpdateError ? "bg-destructive" : "bg-primary"
                          } ${updateProgress.phase === "checking" || updateProgress.phase === "installing" ? "animate-pulse" : ""}`}
                          style={{ width: `${overallPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
                          <Icon className={`h-4.5 w-4.5 ${isCheckingUpdates && item.title.includes("更新进行中") ? "animate-spin" : ""}`} />
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
