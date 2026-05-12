import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus, Settings2, X, PanelTopOpen } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import { PhysicalPosition } from "@tauri-apps/api/dpi";
import { availableMonitors, currentMonitor, getCurrentWindow } from "@tauri-apps/api/window";
import { emit, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { confirm, message, save } from "@tauri-apps/plugin-dialog";
import packageJson from "../../package.json";
import { ViewSwitcher } from "./components/view-switcher";
import { DayView } from "./components/day-view";
import { formatReminderText, parseReminderAt, REMINDER_MODE_LABELS } from "./reminders";
import { DashboardStats, MascotReaction, Task, TaskDraft, ViewType } from "./types";
import {
  backupDatabase,
  clearTasks,
  createTask,
  deleteTask,
  exportTasksJson,
  getDashboardSummary,
  listTasksByDate,
  listTasks,
  postponeOverdueTasks,
  seedExampleTasks,
  updateTask,
  updateTaskCompletion,
} from "./database";

const TASKS_UPDATED_EVENT = "tasks-updated";
const FLOATING_POSITION_KEY = "floating-panel-position";
const HITOKOTO_ENDPOINT = "https://v1.hitokoto.cn/?c=f&encode=text";
const AUTO_UPDATE_CHECK_DELAY = 3500;
const MAIN_THEME_COLOR_KEY = "main-theme-color";
const REMINDER_NOTIFIED_KEYS_KEY = "task-reminder-notified-keys";
const MAX_TIMER_DELAY = 2_147_000_000;
const WeekView = lazy(() => import("./components/week-view").then((module) => ({ default: module.WeekView })));
const MonthView = lazy(() => import("./components/month-view").then((module) => ({ default: module.MonthView })));
const StatsPanel = lazy(() => import("./components/stats-panel").then((module) => ({ default: module.StatsPanel })));
const FloatingPanel = lazy(() => import("./components/floating-panel").then((module) => ({ default: module.FloatingPanel })));
const DateTasksModal = lazy(() => import("./components/date-tasks-modal").then((module) => ({ default: module.DateTasksModal })));
const TaskModal = lazy(() => import("./components/task-modal").then((module) => ({ default: module.TaskModal })));
const ToolsModal = lazy(() => import("./components/tools-modal").then((module) => ({ default: module.ToolsModal })));

type TasksUpdatedEventPayload = {
  source?: string;
};

function TasksLoadingState() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-40 animate-pulse rounded-full bg-muted" />
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-[78px] animate-pulse rounded-2xl border border-border bg-white"
        />
      ))}
    </div>
  );
}

function PanelFallback() {
  return (
    <div className="flex items-center justify-center rounded-2xl border border-border bg-white/80 px-4 py-6 text-sm text-muted-foreground">
      正在加载模块...
    </div>
  );
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbaFromHex(hex: string, alpha: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return `rgba(255,107,107,${alpha})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDelayUntilNextLocalDay() {
  const now = new Date();
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);

  return Math.max(nextDay.getTime() - now.getTime(), 1000);
}

function getTaskReminderKey(task: Pick<Task, "id" | "reminderAt">) {
  return task.reminderAt ? `${task.id}:${task.reminderAt}` : null;
}

function readNotifiedReminderKeys() {
  if (typeof window === "undefined") {
    return new Set<string>();
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(REMINDER_NOTIFIED_KEYS_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
  } catch {
    window.localStorage.removeItem(REMINDER_NOTIFIED_KEYS_KEY);
    return new Set<string>();
  }
}

function persistNotifiedReminderKeys(keys: Set<string>) {
  window.localStorage.setItem(REMINDER_NOTIFIED_KEYS_KEY, JSON.stringify([...keys].slice(-300)));
}

export default function App() {
  const windowRef = useRef(getCurrentWindow());
  const isFloatingWindow = windowRef.current.label === "floating";
  const [view, setView] = useState<ViewType>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalMode, setTaskModalMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [previewDate, setPreviewDate] = useState<Date | null>(null);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isMainWindowMaximized, setIsMainWindowMaximized] = useState(false);
  const [appVersion, setAppVersion] = useState(packageJson.version);
  const [mascotReaction, setMascotReaction] = useState<MascotReaction>({
    type: "idle",
    token: 0,
  });
  const [mainThemeColor, setMainThemeColor] = useState(() => {
    if (typeof window === "undefined") {
      return "#FF6B6B";
    }

    return window.localStorage.getItem(MAIN_THEME_COLOR_KEY) ?? "#FF6B6B";
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);
  const notifiedReminderKeysRef = useRef<Set<string>>(readNotifiedReminderKeys());
  const [stats, setStats] = useState<DashboardStats>({
    totalCount: 0,
    completedCount: 0,
    delayedCount: 0,
    weeklyData: [],
    categoryData: [],
  });
  const [dailyQuote, setDailyQuote] = useState("正在获取今日一句...");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    if (typeof error === "string" && error.trim()) {
      return error;
    }

    if (error && typeof error === "object") {
      try {
        const serialized = JSON.stringify(error);
        if (serialized && serialized !== "{}") {
          return serialized;
        }
      } catch {
        return fallback;
      }
    }

    return fallback;
  };

  const loadTasksForCurrentWindow = useCallback(() => {
    if (isFloatingWindow) {
      return listTasksByDate(getLocalDateKey(new Date()));
    }

    return listTasks();
  }, [isFloatingWindow]);

  const refreshData = useCallback(async () => {
    await postponeOverdueTasks(getLocalDateKey(new Date()));
    const [loadedTasks, loadedStats] = await Promise.all([loadTasksForCurrentWindow(), getDashboardSummary()]);
    setTasks(loadedTasks);
    setStats(loadedStats);
  }, [loadTasksForCurrentWindow]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        await postponeOverdueTasks(getLocalDateKey(new Date()));
        const [loadedTasks, loadedStats] = await Promise.all([loadTasksForCurrentWindow(), getDashboardSummary()]);
        if (!cancelled) {
          setTasks(loadedTasks);
          setStats(loadedStats);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "任务数据加载失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [loadTasksForCurrentWindow]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void listen<TasksUpdatedEventPayload>(TASKS_UPDATED_EVENT, (event) => {
      if (event.payload?.source === windowRef.current.label) {
        return;
      }

      void refreshData();
    }).then((dispose) => {
      if (cancelled) {
        dispose();
      } else {
        unlisten = dispose;
      }
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [refreshData]);

  useEffect(() => {
    if (isFloatingWindow) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadDailyQuote() {
      try {
        const response = await fetch(HITOKOTO_ENDPOINT, {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`每日一言请求失败：${response.status}`);
        }

        const text = (await response.text()).trim();
        setDailyQuote(text || "今天也要把重要的事认真完成。");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setDailyQuote("今天也要把重要的事认真完成。");
      }
    }

    void loadDailyQuote();

    return () => {
      controller.abort();
    };
  }, [isFloatingWindow]);

  useEffect(() => {
    if (isFloatingWindow) {
      return;
    }

    let unlistenResize: (() => void) | undefined;
    let cancelled = false;

    void windowRef.current.isMaximized().then(setIsMainWindowMaximized);
    void windowRef.current.onResized(() => {
      void windowRef.current.isMaximized().then(setIsMainWindowMaximized);
    }).then((dispose) => {
      if (cancelled) {
        dispose();
      } else {
        unlistenResize = dispose;
      }
    });

    return () => {
      cancelled = true;
      unlistenResize?.();
    };
  }, [isFloatingWindow]);

  useEffect(() => {
    if (isFloatingWindow) {
      return;
    }

    let cancelled = false;

    void getVersion()
      .then((version) => {
        if (!cancelled && version) {
          setAppVersion(version);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [isFloatingWindow]);

  useEffect(() => {
    if (isFloatingWindow) {
      return;
    }

    const root = document.documentElement;
    root.style.setProperty("--primary", mainThemeColor);
    root.style.setProperty("--ring", mainThemeColor);
    root.style.setProperty("--chart-1", mainThemeColor);
    root.style.setProperty("--sidebar-primary", mainThemeColor);
    root.style.setProperty("--sidebar-ring", mainThemeColor);
    root.style.setProperty("--primary-soft", rgbaFromHex(mainThemeColor, 0.12));
    root.style.setProperty("--primary-soft-strong", rgbaFromHex(mainThemeColor, 0.18));
    window.localStorage.setItem(MAIN_THEME_COLOR_KEY, mainThemeColor);
  }, [isFloatingWindow, mainThemeColor]);

  const handleMainThemeColorChange = useCallback((color: string) => {
    const normalized = color.trim();
    const withHash = normalized.startsWith("#") ? normalized : `#${normalized}`;
    if (/^#[0-9a-fA-F]{0,6}$/.test(withHash)) {
      if (withHash.length === 7) {
        setMainThemeColor(withHash);
      } else if (normalized === "") {
        setMainThemeColor("#FF6B6B");
      }
    }
  }, []);

  const notifyTasksUpdated = useCallback(async () => {
    await emit(TASKS_UPDATED_EVENT, { source: windowRef.current.label } satisfies TasksUpdatedEventPayload);
  }, []);

  const ensureNotificationPermission = useCallback(async () => {
    const { isPermissionGranted, requestPermission } = await import("@tauri-apps/plugin-notification");
    if (await isPermissionGranted()) {
      return true;
    }

    return (await requestPermission()) === "granted";
  }, []);

  const sendTaskReminder = useCallback(async (task: Task) => {
    const reminderKey = getTaskReminderKey(task);
    if (!reminderKey || notifiedReminderKeysRef.current.has(reminderKey) || task.completed) {
      return;
    }

    try {
      const [{ sendNotification }, permissionGranted] = await Promise.all([
        import("@tauri-apps/plugin-notification"),
        ensureNotificationPermission(),
      ]);

      if (permissionGranted) {
        const dueText = task.dueAt ? `到期时间：${formatReminderText(task.dueAt)}` : "";
        const descriptionText = task.description ? `\n${task.description}` : "";
        sendNotification({
          title: "待办提醒",
          body: `${task.title}${dueText ? `\n${dueText}` : ""}\n提醒方式：${REMINDER_MODE_LABELS[task.reminderMode]}${descriptionText}`,
        });
      } else {
        setErrorMessage("提醒时间已到，但系统通知权限未开启。");
      }
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "任务提醒发送失败"));
    } finally {
      notifiedReminderKeysRef.current.add(reminderKey);
      persistNotifiedReminderKeys(notifiedReminderKeysRef.current);
    }
  }, [ensureNotificationPermission]);

  useEffect(() => {
    if (isFloatingWindow) {
      return;
    }

    const activeReminderKeys = new Set(
      tasks.map(getTaskReminderKey).filter((key): key is string => Boolean(key))
    );
    let changed = false;

    for (const reminderKey of notifiedReminderKeysRef.current) {
      if (!activeReminderKeys.has(reminderKey)) {
        notifiedReminderKeysRef.current.delete(reminderKey);
        changed = true;
      }
    }

    if (changed) {
      persistNotifiedReminderKeys(notifiedReminderKeysRef.current);
    }
  }, [isFloatingWindow, tasks]);

  useEffect(() => {
    if (isFloatingWindow) {
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;

    const scheduleNextReminder = () => {
      if (cancelled) {
        return;
      }

      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        timerId = undefined;
      }

      const now = Date.now();
      const pendingReminders = tasksRef.current
        .map((task) => {
          const reminderDate = parseReminderAt(task.reminderAt);
          const reminderKey = getTaskReminderKey(task);

          return reminderDate && reminderKey
            ? { task, reminderKey, time: reminderDate.getTime() }
            : null;
        })
        .filter((item): item is { task: Task; reminderKey: string; time: number } =>
          Boolean(item) &&
          !item.task.completed &&
          !notifiedReminderKeysRef.current.has(item.reminderKey)
        )
        .sort((a, b) => a.time - b.time);

      const dueReminders = pendingReminders.filter((item) => item.time <= now + 500);
      if (dueReminders.length > 0) {
        void Promise.all(dueReminders.map((item) => sendTaskReminder(item.task))).finally(() => {
          scheduleNextReminder();
        });
        return;
      }

      const nextReminder = pendingReminders[0];
      if (!nextReminder) {
        return;
      }

      timerId = window.setTimeout(
        scheduleNextReminder,
        Math.min(Math.max(nextReminder.time - now, 1000), MAX_TIMER_DELAY)
      );
    };

    scheduleNextReminder();

    return () => {
      cancelled = true;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [isFloatingWindow, sendTaskReminder, tasks]);

  useEffect(() => {
    let cancelled = false;
    let timerId: number | undefined;

    const scheduleRollover = () => {
      timerId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const today = new Date();
        if (!isFloatingWindow) {
          setSelectedDate(today);
        }

        void refreshData()
          .then(notifyTasksUpdated)
          .catch((error) => {
            setErrorMessage(error instanceof Error ? error.message : "延迟任务处理失败");
          })
          .finally(() => {
            if (!cancelled) {
              scheduleRollover();
            }
          });
      }, getDelayUntilNextLocalDay());
    };

    scheduleRollover();

    return () => {
      cancelled = true;
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
  }, [isFloatingWindow, notifyTasksUpdated, refreshData]);

  const openCreateTaskModal = useCallback(() => {
    setTaskModalMode("create");
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }, []);

  const openEditTaskModal = useCallback((task: Task) => {
    setPreviewDate(null);
    setTaskModalMode("edit");
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const openDateTasksModal = useCallback((date: Date) => {
    setSelectedDate(date);
    setPreviewDate(date);
  }, []);

  const handleToggleTask = useCallback(async (id: string) => {
    const currentTask = tasksRef.current.find((task) => task.id === id);
    if (!currentTask) {
      return;
    }

    const nextCompleted = !currentTask.completed;
    setTasks((prev) => {
      const nextTasks = prev.map((task) =>
        task.id === id ? { ...task, completed: nextCompleted } : task
      );
      tasksRef.current = nextTasks;
      return nextTasks;
    });

    try {
      await updateTaskCompletion(id, nextCompleted);
      // 从内存派生 stats，避免额外的数据库查询
      setStats((prev) => ({
        ...prev,
        completedCount: prev.completedCount + (nextCompleted ? 1 : -1),
        delayedCount: currentTask.delayed
          ? Math.max(prev.delayedCount + (nextCompleted ? -1 : 1), 0)
          : prev.delayedCount,
      }));
      if (nextCompleted) {
        setMascotReaction({ type: "task-completed", token: Date.now() });
      }
      await notifyTasksUpdated();
    } catch (error) {
      setTasks((prev) => {
        const revertedTasks = prev.map((task) =>
          task.id === id ? { ...task, completed: currentTask.completed } : task
        );
        tasksRef.current = revertedTasks;
        return revertedTasks;
      });
      setErrorMessage(error instanceof Error ? error.message : "任务状态更新失败");
    }
  }, [notifyTasksUpdated]);

  const handleDeleteTask = useCallback(async (id: string) => {
    try {
      await deleteTask(id);
      await refreshData();
      setMascotReaction({ type: "task-deleted", token: Date.now() });
      await notifyTasksUpdated();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "任务删除失败");
    }
  }, [refreshData, notifyTasksUpdated]);

  const handleAddTask = useCallback(async (newTask: TaskDraft) => {
    try {
      const isEditing = taskModalMode === "edit" && editingTask;
      let reminderNotice: string | null = null;

      if (newTask.reminderAt) {
        try {
          if (!(await ensureNotificationPermission())) {
            reminderNotice = "提醒时间已保存，但系统通知权限未开启。";
          }
        } catch (error) {
          reminderNotice = getErrorMessage(error, "提醒时间已保存，但通知权限请求失败。");
        }
      }

      if (taskModalMode === "edit" && editingTask) {
        await updateTask(editingTask.id, newTask);
      } else {
        await createTask(newTask);
      }

      await refreshData();
      if (isEditing) {
        setMascotReaction({ type: "task-updated", token: Date.now() });
      } else {
        setMascotReaction({ type: "task-added", token: Date.now() });
      }
      await notifyTasksUpdated();
      setErrorMessage(reminderNotice);
    } catch (error) {
      const message = error instanceof Error ? error.message : "任务创建失败";
      setErrorMessage(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }, [taskModalMode, editingTask, ensureNotificationPermission, refreshData, notifyTasksUpdated]);

  const completedCount = stats.completedCount;
  const totalCount = stats.totalCount;

  const selectedDateTasks = useMemo(
    () => tasks.filter((t) => t.date.toDateString() === selectedDate.toDateString()),
    [tasks, selectedDate]
  );

  const previewDateTasks = useMemo(
    () => (previewDate ? tasks.filter((t) => t.date.toDateString() === previewDate.toDateString()) : []),
    [tasks, previewDate]
  );

  const handleExportJson = useCallback(async () => {
    const filePath = await save({
      title: "导出任务 JSON",
      defaultPath: "tasks-export.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!filePath) {
      return;
    }

    await exportTasksJson(filePath);
    await message("任务数据已导出。", { title: "导出成功", kind: "info" });
  }, []);

  const handleBackupDatabase = useCallback(async () => {
    const filePath = await save({
      title: "备份 SQLite 数据库",
      defaultPath: "tasks-backup.db",
      filters: [{ name: "SQLite", extensions: ["db", "sqlite"] }],
    });

    if (!filePath) {
      return;
    }

    await backupDatabase(filePath);
    await message("数据库备份已生成。", { title: "备份成功", kind: "info" });
  }, []);

  const handleClearAll = useCallback(async () => {
    const accepted = await confirm("这会清空数据库中的全部任务，且无法撤销。确定继续吗？", {
      title: "清空全部任务",
      kind: "warning",
      okLabel: "确认清空",
      cancelLabel: "取消",
    });

    if (!accepted) {
      return;
    }

    await clearTasks();
    await refreshData();
    setMascotReaction({ type: "tasks-cleared", token: Date.now() });
    await notifyTasksUpdated();
    await message("所有任务已清空。", { title: "已完成", kind: "info" });
  }, [refreshData, notifyTasksUpdated]);

  const handleSeedExamples = useCallback(async () => {
    await seedExampleTasks();
    await refreshData();
    setMascotReaction({ type: "examples-loaded", token: Date.now() });
    await notifyTasksUpdated();
    await message("示例任务已经载入。", { title: "初始化完成", kind: "info" });
  }, [refreshData, notifyTasksUpdated]);

  const checkForUpdates = useCallback(async (silent = false) => {
    if (!silent) {
      setIsCheckingUpdates(true);
    }

    try {
      const [{ check }, { relaunch }] = await Promise.all([
        import("@tauri-apps/plugin-updater"),
        import("@tauri-apps/plugin-process"),
      ]);
      const update = await check();

      if (!update) {
        if (!silent) {
          await message("当前已经是最新版本。", { title: "检查更新", kind: "info" });
        }
        return;
      }

      const accepted = await confirm(`发现新版本 ${update.version}，是否立即下载安装？`, {
        title: "发现更新",
        kind: "info",
        okLabel: "立即更新",
        cancelLabel: "稍后再说",
      });

      if (!accepted) {
        return;
      }

      await update.downloadAndInstall();
      await message("更新安装完成，应用将自动重启。", { title: "更新完成", kind: "info" });
      await relaunch();
    } catch (error) {
      if (!silent) {
        await message(getErrorMessage(error, "检查更新失败"), { title: "检查更新失败", kind: "error" });
      }
    } finally {
      if (!silent) {
        setIsCheckingUpdates(false);
      }
    }
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    await checkForUpdates(false);
  }, [checkForUpdates]);

  useEffect(() => {
    if (isFloatingWindow) {
      return;
    }

    const timer = window.setTimeout(() => {
      void checkForUpdates(true);
    }, AUTO_UPDATE_CHECK_DELAY);

    return () => {
      window.clearTimeout(timer);
    };
  }, [checkForUpdates, isFloatingWindow]);

  const moveFloatingWindowToCorner = useCallback(async (floatingWindow: WebviewWindow) => {
    const [monitorList, activeMonitor] = await Promise.all([
      availableMonitors(),
      currentMonitor(),
    ]);
    const targetMonitor = activeMonitor ?? monitorList[0];

    if (!targetMonitor) {
      return;
    }

    const size = await floatingWindow.outerSize();
    const workArea = targetMonitor.workArea ?? {
      position: targetMonitor.position,
      size: targetMonitor.size,
    };
    const margin = 64;
    const targetX = workArea.position.x + workArea.size.width - size.width - margin;
    const targetY = workArea.position.y + workArea.size.height - size.height - margin;

    await floatingWindow.setPosition(new PhysicalPosition(targetX, targetY));
  }, []);

  const handleOpenFloatingWindow = useCallback(async () => {
    try {
      const hideMainWindowForFloating = async () => {
        await windowRef.current.setSkipTaskbar(true);
        await windowRef.current.hide();
      };

      window.localStorage.removeItem(FLOATING_POSITION_KEY);
      const existingWindow = await WebviewWindow.getByLabel("floating");

      if (existingWindow) {
        await existingWindow.setSkipTaskbar(true);
        await existingWindow.setAlwaysOnTop(true);
        await existingWindow.setResizable(false);
        await existingWindow.setMaximizable(false);
        await moveFloatingWindowToCorner(existingWindow);
        await existingWindow.show();
        await existingWindow.setFocus();
        await hideMainWindowForFloating();
        return;
      }

      const floatingWindow = new WebviewWindow("floating", {
        title: "待办浮窗",
        url: "/?floating=1",
        width: 320,
        height: 460,
        minWidth: 244,
        minHeight: 44,
        resizable: false,
        maximizable: false,
        minimizable: false,
        decorations: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        center: false,
        transparent: true,
        shadow: false,
      });

      floatingWindow.once("tauri://created", () => {
        void (async () => {
          await floatingWindow.setSkipTaskbar(true);
          await floatingWindow.setAlwaysOnTop(true);
          await floatingWindow.setResizable(false);
          await floatingWindow.setMaximizable(false);
          await moveFloatingWindowToCorner(floatingWindow);
          await floatingWindow.show();
          await floatingWindow.setFocus();
          await hideMainWindowForFloating();
          setErrorMessage(null);
        })().catch((error) => {
          setErrorMessage(getErrorMessage(error, "浮窗打开失败"));
        });
      });

      floatingWindow.once("tauri://error", (event) => {
        setErrorMessage(getErrorMessage(event.payload, "浮窗打开失败"));
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "浮窗打开失败"));
    }
  }, [moveFloatingWindowToCorner]);

  const handleMinimizeMainWindow = useCallback(async () => {
    await windowRef.current.minimize();
  }, []);

  const handleToggleMainWindowMaximize = useCallback(async () => {
    const maximized = await windowRef.current.isMaximized();
    if (maximized) {
      await windowRef.current.unmaximize();
      setIsMainWindowMaximized(false);
    } else {
      await windowRef.current.maximize();
      setIsMainWindowMaximized(true);
    }
  }, []);

  const handleCloseMainWindow = useCallback(async () => {
    await windowRef.current.close();
  }, []);

  if (isFloatingWindow) {
    return (
      <Suspense fallback={null}>
        <FloatingPanel
          tasks={tasks}
          completedCount={completedCount}
          totalCount={totalCount}
          onToggle={handleToggleTask}
        />
      </Suspense>
    );
  }

  return (
    <div className="flex size-full">
      <div
        className={`flex flex-1 flex-col overflow-hidden border border-border/70 bg-white ${isMainWindowMaximized ? "" : "rounded-[18px]"}`}
        style={{ boxShadow: isMainWindowMaximized ? undefined : `0 18px 44px ${rgbaFromHex(mainThemeColor, 0.12)}` }}
      >
        <div
          className="flex h-9 items-center justify-between border-b border-border/70 bg-white/96 pl-3 pr-1"
          style={{ background: `linear-gradient(180deg, ${rgbaFromHex(mainThemeColor, 0.06)} 0%, rgba(255,255,255,0.96) 100%)` }}
        >
          <div
            data-tauri-drag-region
            className="flex flex-1 items-center gap-2 self-stretch"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary">
              <div className="h-2.5 w-2.5 rounded-[4px] bg-white" />
            </div>
            <span className="text-[13px] text-foreground">我的待办</span>
            <span className="rounded-full border border-border/80 bg-white/82 px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              v{appVersion}
            </span>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => void handleMinimizeMainWindow()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="最小化"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => void handleToggleMainWindowMaximize()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title={isMainWindowMaximized ? "还原" : "最大化"}
            >
              {isMainWindowMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => void handleCloseMainWindow()}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/12 hover:text-destructive"
              title="关闭"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div
          className="flex min-h-0 flex-1 px-3 py-3"
          style={{
            background: `radial-gradient(circle at top left, ${rgbaFromHex(mainThemeColor, 0.06)} 0%, rgba(248,250,252,0.92) 24%, rgba(255,255,255,1) 60%)`,
          }}
        >
          <div className="flex min-h-0 w-full items-start gap-4">
            <div className="flex min-w-0 flex-1 flex-col self-stretch overflow-hidden">
              <header
                className="border-b border-border bg-white px-3.5 py-2.5"
                style={{ background: `linear-gradient(180deg, ${rgbaFromHex(mainThemeColor, 0.05)} 0%, rgba(255,255,255,1) 100%)` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <ViewSwitcher currentView={view} onViewChange={setView} />

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => void handleOpenFloatingWindow()}
                      className="rounded-lg p-1.5 transition-transform hover:scale-105 hover:bg-muted active:scale-95"
                      title="打开浮窗"
                    >
                      <PanelTopOpen className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => setIsToolsModalOpen(true)}
                      className="rounded-lg p-1.5 transition-transform hover:scale-105 hover:bg-muted active:scale-95"
                    >
                      <Settings2 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={openCreateTaskModal}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 active:scale-95"
                      title="新建任务"
                      aria-label="新建任务"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </header>

              <main className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-0 w-full flex-1 flex-col gap-3">
                  {errorMessage && (
                    <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  )}
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    {isLoading ? (
                      <div className="rounded-[24px] border border-border/70 bg-white/88 p-3 shadow-sm backdrop-blur-sm">
                        <TasksLoadingState />
                      </div>
                    ) : tasks.length === 0 ? (
                      <div className="flex min-h-[280px] h-full items-center justify-center">
                        <div className="max-w-md rounded-2xl border border-border bg-white p-5 text-center shadow-sm">
                          <h2 className="text-xl">欢迎来到你的本地待办空间</h2>
                          <p className="mt-2.5 text-[13px] leading-6 text-muted-foreground">
                            当前数据库还是空的。你可以先创建第一条任务，或者一键载入示例任务，先把日历、统计和迷你模式完整跑一遍。
                          </p>
                          <div className="mt-4 flex justify-center gap-2.5">
                            <button
                              onClick={openCreateTaskModal}
                              className="rounded-lg bg-primary px-3.5 py-2 text-[13px] text-primary-foreground"
                            >
                              创建首个任务
                            </button>
                            <button
                              onClick={() => void handleSeedExamples()}
                              className="rounded-lg border border-border px-3.5 py-2 text-[13px]"
                            >
                              载入示例任务
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <>
                      {view === "day" && (
                        <div className="rounded-[24px] border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                          <DayView
                            tasks={selectedDateTasks}
                            onToggle={handleToggleTask}
                            onDelete={handleDeleteTask}
                            onEdit={openEditTaskModal}
                            selectedDate={selectedDate}
                          />
                        </div>
                      )}

                      {view === "week" && (
                        <div className="rounded-[24px] border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                          <Suspense fallback={<PanelFallback />}>
                            <WeekView
                              tasks={tasks}
                              onToggle={handleToggleTask}
                              onDelete={handleDeleteTask}
                              onEdit={openEditTaskModal}
                              selectedDate={selectedDate}
                              onDateSelect={setSelectedDate}
                              onDateOpen={openDateTasksModal}
                              onWeekChange={setSelectedDate}
                            />
                          </Suspense>
                        </div>
                      )}

                      {view === "month" && (
                        <div className="rounded-[24px] border border-border/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm">
                          <Suspense fallback={<PanelFallback />}>
                            <MonthView
                              tasks={tasks}
                              selectedDate={selectedDate}
                              onDateSelect={setSelectedDate}
                              onDateOpen={openDateTasksModal}
                            />
                          </Suspense>
                        </div>
                      )}
                    </>
                    )}
                  </div>

                  <div
                    className="mt-auto rounded-[20px] border border-border/70 bg-white/88 px-3.5 py-3 shadow-sm backdrop-blur-sm"
                    style={{
                      background: `linear-gradient(135deg, ${rgbaFromHex(mainThemeColor, 0.06)} 0%, rgba(255,255,255,0.96) 42%, rgba(255,255,255,1) 100%)`,
                    }}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                      每日一言
                    </p>
                    <p className="mt-1.5 text-[13px] leading-5 text-foreground/78" title={dailyQuote}>
                      {dailyQuote}
                    </p>
                  </div>
                </div>
              </main>
            </div>

            <div className="w-[240px] flex-none self-stretch border-l border-border bg-white">
              {isLoading ? (
                <div className="bg-white p-2.5">
                  <div className="mb-2 h-4 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="h-[74px] animate-pulse rounded-lg bg-muted/70" />
                    <div className="h-[74px] animate-pulse rounded-lg bg-muted/70" />
                  </div>
                  <div className="mt-2 h-[76px] animate-pulse rounded-lg bg-muted/70" />
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="bg-white p-2.5">
                      <PanelFallback />
                    </div>
                  }
                >
                  <StatsPanel
                    completedCount={stats.completedCount}
                    totalCount={stats.totalCount}
                    delayedCount={stats.delayedCount}
                    mascotReaction={mascotReaction}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>

      {previewDate !== null && (
        <Suspense fallback={null}>
          <DateTasksModal
            isOpen
            date={previewDate}
            tasks={previewDateTasks}
            onClose={() => setPreviewDate(null)}
            onToggle={handleToggleTask}
            onDelete={handleDeleteTask}
            onEdit={openEditTaskModal}
          />
        </Suspense>
      )}

      {(isTaskModalOpen || isToolsModalOpen) && (
        <Suspense fallback={null}>
          <TaskModal
            isOpen={isTaskModalOpen}
            mode={taskModalMode}
            initialDate={selectedDate}
            task={editingTask}
            onClose={() => setIsTaskModalOpen(false)}
            onSubmit={handleAddTask}
          />

          <ToolsModal
            isOpen={isToolsModalOpen}
            onClose={() => setIsToolsModalOpen(false)}
            onExportJson={handleExportJson}
            onBackupDatabase={handleBackupDatabase}
            onClearAll={handleClearAll}
            onSeedExampleTasks={handleSeedExamples}
            onCheckUpdates={handleCheckUpdates}
            mainThemeColor={mainThemeColor}
            onMainThemeColorChange={handleMainThemeColorChange}
            isCheckingUpdates={isCheckingUpdates}
            taskCount={stats.totalCount}
          />
        </Suspense>
      )}
    </div>
    </div>
  );
}
