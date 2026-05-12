import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Check, ChevronDown, EyeOff, House, ListTodo, Palette, Pin, X } from "lucide-react";
import { PhysicalPosition, PhysicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow, Window } from "@tauri-apps/api/window";
import { isSameDay } from "date-fns";
import { Task } from "../types";

const FLOATING_COLLAPSED_KEY = "floating-panel-collapsed";
const FLOATING_ONLY_PENDING_KEY = "floating-panel-only-pending";
const FLOATING_POSITION_KEY = "floating-panel-position";
const FLOATING_THEME_KEY = "floating-panel-theme";
const FLOATING_CUSTOM_COLOR_KEY = "floating-panel-custom-color";
const FLOATING_PINNED_KEY = "floating-panel-pinned";
type FloatingPoint = { x: number; y: number };

const FLOATING_THEMES = [
  {
    id: "sand",
    label: "暖沙",
    panelStart: "rgba(255,253,248,0.98)",
    panelEnd: "rgba(250,247,240,0.95)",
    border: "rgba(255,255,255,0.7)",
    headerBg: "rgba(255,255,255,0.35)",
    accent: "#0f172a",
    accentText: "#ffffff",
    surface: "rgba(255,255,255,0.9)",
    surfaceAlt: "rgba(255,255,255,0.7)",
    progressBg: "#e2e8f0",
  },
  {
    id: "mint",
    label: "薄荷",
    panelStart: "rgba(241,253,247,0.98)",
    panelEnd: "rgba(227,248,238,0.95)",
    border: "rgba(187,247,208,0.8)",
    headerBg: "rgba(236,253,245,0.65)",
    accent: "#047857",
    accentText: "#ffffff",
    surface: "rgba(255,255,255,0.92)",
    surfaceAlt: "rgba(209,250,229,0.6)",
    progressBg: "#bbf7d0",
  },
  {
    id: "sky",
    label: "晴空",
    panelStart: "rgba(242,249,255,0.98)",
    panelEnd: "rgba(229,241,255,0.95)",
    border: "rgba(191,219,254,0.85)",
    headerBg: "rgba(239,246,255,0.7)",
    accent: "#2563eb",
    accentText: "#ffffff",
    surface: "rgba(255,255,255,0.92)",
    surfaceAlt: "rgba(219,234,254,0.7)",
    progressBg: "#bfdbfe",
  },
  {
    id: "peach",
    label: "蜜桃",
    panelStart: "rgba(255,245,244,0.98)",
    panelEnd: "rgba(255,236,230,0.95)",
    border: "rgba(254,205,211,0.85)",
    headerBg: "rgba(255,241,242,0.72)",
    accent: "#e11d48",
    accentText: "#ffffff",
    surface: "rgba(255,255,255,0.92)",
    surfaceAlt: "rgba(254,226,226,0.68)",
    progressBg: "#fecdd3",
  },
  {
    id: "custom",
    label: "自定义",
    panelStart: "rgba(245,247,250,0.98)",
    panelEnd: "rgba(235,239,244,0.95)",
    border: "rgba(203,213,225,0.85)",
    headerBg: "rgba(248,250,252,0.76)",
    accent: "#475569",
    accentText: "#ffffff",
    surface: "rgba(255,255,255,0.92)",
    surfaceAlt: "rgba(241,245,249,0.72)",
    progressBg: "#cbd5e1",
  },
] as const;

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
    return `rgba(71,85,105,${alpha})`;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function mixHexWithWhite(hex: string, whiteRatio: number) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return "#f8fafc";
  }

  const mix = (channel: number) => Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio);
  const toHex = (channel: number) => mix(channel).toString(16).padStart(2, "0");

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

interface FloatingPanelProps {
  tasks: Task[];
  completedCount: number;
  totalCount: number;
  onToggle: (id: string) => void;
}

export function FloatingPanel({
  tasks,
  completedCount,
  totalCount,
  onToggle,
}: FloatingPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem(FLOATING_COLLAPSED_KEY) === "true";
  });
  const [onlyPending, setOnlyPending] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const savedValue = window.localStorage.getItem(FLOATING_ONLY_PENDING_KEY);
    return savedValue === null ? true : savedValue === "true";
  });
  const [selectedThemeId, setSelectedThemeId] = useState(() => {
    if (typeof window === "undefined") {
      return FLOATING_THEMES[0].id;
    }

    return window.localStorage.getItem(FLOATING_THEME_KEY) ?? FLOATING_THEMES[0].id;
  });
  const [customAccent, setCustomAccent] = useState(() => {
    if (typeof window === "undefined") {
      return "#475569";
    }

    return window.localStorage.getItem(FLOATING_CUSTOM_COLOR_KEY) ?? "#475569";
  });
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    const savedValue = window.localStorage.getItem(FLOATING_PINNED_KEY);
    return savedValue === null ? true : savedValue === "true";
  });
  const [shouldRenderContent, setShouldRenderContent] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(FLOATING_COLLAPSED_KEY) !== "true";
  });
  const [isContentVisible, setIsContentVisible] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.localStorage.getItem(FLOATING_COLLAPSED_KEY) !== "true";
  });
  const sizeAnimationRef = useRef<number | null>(null);
  const contentAnimationFrameRef = useRef<number | null>(null);
  const positionSaveTimerRef = useRef<number | null>(null);
  const queuedPositionRef = useRef<FloatingPoint | null>(null);
  const lastPositionSaveRef = useRef(0);
  const today = new Date();
  const todayTasks = useMemo(
    () => tasks.filter((task) => isSameDay(task.date, today)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks]
  );
  const pendingTasks = useMemo(
    () => todayTasks.filter((task) => !task.completed),
    [todayTasks]
  );
  const visibleTasks = useMemo(
    () => (onlyPending ? pendingTasks : todayTasks),
    [onlyPending, pendingTasks, todayTasks]
  );
  const indicatorColor = "var(--primary)";
  const completionRate =
    totalCount === 0 ? "0%" : `${Math.round((completedCount / totalCount) * 100)}%`;
  const presetTheme =
    FLOATING_THEMES.find((item) => item.id === selectedThemeId) ?? FLOATING_THEMES[0];
  const theme =
    selectedThemeId === "custom"
      ? {
          ...presetTheme,
          accent: customAccent,
          border: rgbaFromHex(customAccent, 0.34),
          headerBg: mixHexWithWhite(customAccent, 0.86),
          panelStart: mixHexWithWhite(customAccent, 0.93),
          panelEnd: mixHexWithWhite(customAccent, 0.86),
          surfaceAlt: mixHexWithWhite(customAccent, 0.9),
          progressBg: rgbaFromHex(customAccent, 0.28),
        }
      : presetTheme;

  const flushFloatingPosition = () => {
    if (!queuedPositionRef.current) {
      return;
    }

    window.localStorage.setItem(FLOATING_POSITION_KEY, JSON.stringify(queuedPositionRef.current));
    queuedPositionRef.current = null;
    positionSaveTimerRef.current = null;
    lastPositionSaveRef.current = performance.now();
  };

  const scheduleFloatingPositionSave = (position: FloatingPoint) => {
    queuedPositionRef.current = position;

    if (performance.now() - lastPositionSaveRef.current > 180) {
      flushFloatingPosition();
      return;
    }

    if (positionSaveTimerRef.current === null) {
      positionSaveTimerRef.current = window.setTimeout(flushFloatingPosition, 180);
    }
  };

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    const targetSize = isCollapsed
      ? new PhysicalSize(268, 44)
      : new PhysicalSize(320, onlyPending ? 460 : 500);
    const duration = isCollapsed ? 180 : 380;
    let cancelled = false;

    void currentWindow
      .setMinSize(new PhysicalSize(isCollapsed ? 268 : 300, 44))
      .then(() => currentWindow.outerSize())
      .then((startSize) => {
        if (cancelled) {
          return;
        }

        if (sizeAnimationRef.current !== null) {
          window.cancelAnimationFrame(sizeAnimationRef.current);
        }

        const startTime = performance.now();
        const startWidth = startSize.width;
        const startHeight = startSize.height;
        const deltaWidth = targetSize.width - startWidth;
        const deltaHeight = targetSize.height - startHeight;

        const step = (now: number) => {
          if (cancelled) {
            return;
          }

          const progress = Math.min((now - startTime) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          const width = Math.round(startWidth + deltaWidth * eased);
          const height = Math.round(startHeight + deltaHeight * eased);

          void currentWindow.setSize(new PhysicalSize(width, height));

          if (progress < 1) {
            sizeAnimationRef.current = window.requestAnimationFrame(step);
          } else {
            sizeAnimationRef.current = null;
          }
        };

        sizeAnimationRef.current = window.requestAnimationFrame(step);
      });

    return () => {
      cancelled = true;
      if (sizeAnimationRef.current !== null) {
        window.cancelAnimationFrame(sizeAnimationRef.current);
        sizeAnimationRef.current = null;
      }
    };
  }, [isCollapsed, onlyPending]);

  useEffect(() => {
    if (contentAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(contentAnimationFrameRef.current);
      contentAnimationFrameRef.current = null;
    }

    if (!isCollapsed) {
      setShouldRenderContent(true);
      contentAnimationFrameRef.current = window.requestAnimationFrame(() => {
        contentAnimationFrameRef.current = window.requestAnimationFrame(() => {
          setIsContentVisible(true);
          contentAnimationFrameRef.current = null;
        });
      });

      return () => {
        if (contentAnimationFrameRef.current !== null) {
          window.cancelAnimationFrame(contentAnimationFrameRef.current);
          contentAnimationFrameRef.current = null;
        }
      };
    }

    setIsContentVisible(false);
    const timeoutId = window.setTimeout(() => {
      setShouldRenderContent(false);
    }, 180);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(FLOATING_COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    window.localStorage.setItem(FLOATING_ONLY_PENDING_KEY, String(onlyPending));
  }, [onlyPending]);

  useEffect(() => {
    window.localStorage.setItem(FLOATING_THEME_KEY, selectedThemeId);
  }, [selectedThemeId]);

  useEffect(() => {
    window.localStorage.setItem(FLOATING_CUSTOM_COLOR_KEY, customAccent);
  }, [customAccent]);

  useEffect(() => {
    window.localStorage.setItem(FLOATING_PINNED_KEY, String(isPinned));
    void getCurrentWindow().setAlwaysOnTop(isPinned);
  }, [isPinned]);

  useEffect(() => {
    const currentWindow = getCurrentWindow();
    const savedPosition = window.localStorage.getItem(FLOATING_POSITION_KEY);

    if (savedPosition) {
      try {
        const position = JSON.parse(savedPosition) as FloatingPoint;
        void currentWindow.setPosition(new PhysicalPosition(position.x, position.y));
      } catch {
        window.localStorage.removeItem(FLOATING_POSITION_KEY);
      }
    }

    let unlisten: (() => void) | undefined;
    void currentWindow.onMoved(({ payload }) => {
      const currentPosition = { x: payload.x, y: payload.y };
      scheduleFloatingPositionSave(currentPosition);
    }).then((dispose) => {
      unlisten = dispose;
    });

    return () => {
      if (positionSaveTimerRef.current !== null) {
        window.clearTimeout(positionSaveTimerRef.current);
        positionSaveTimerRef.current = null;
      }
      flushFloatingPosition();
      unlisten?.();
    };
  }, []);

  const handleOpenMainWindow = async () => {
    const currentWindow = getCurrentWindow();
    const mainWindow = await Window.getByLabel("main");

    if (!mainWindow) {
      return;
    }

    await currentWindow.setAlwaysOnTop(false);
    await mainWindow.setSkipTaskbar(false);
    await mainWindow.show();
    await mainWindow.setFocus();
    await currentWindow.close();
  };

  const handleTogglePinned = () => {
    setIsPinned((value) => !value);
  };

  const handleStartDragging = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void getCurrentWindow().startDragging();
  };

  return (
    <div className="flex size-full p-0">
      <div
        className="flex flex-1 flex-col overflow-hidden rounded-[24px] text-slate-900"
        style={{
          border: `1px solid ${theme.border}`,
          backgroundImage: `linear-gradient(180deg, ${theme.panelStart} 0%, ${theme.panelEnd} 100%)`,
          boxShadow: isCollapsed ? "none" : "inset 0 1px 0 rgba(255,255,255,0.65)",
        }}
      >
      <div
        onMouseDown={handleStartDragging}
        data-tauri-drag-region
        className="flex h-11 cursor-move items-center justify-between gap-2 border-b border-black/5 px-3"
        style={{ backgroundColor: theme.headerBg }}
      >
        <div
          data-tauri-drag-region
          className="relative z-10 flex h-full w-11 shrink-0 cursor-grab items-center justify-start active:cursor-grabbing"
          onMouseDown={handleStartDragging}
          title="拖动浮窗"
        >
          <div
            data-tauri-drag-region
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/70"
            style={{
              background: `linear-gradient(135deg, ${theme.accent} 0%, ${rgbaFromHex(theme.accent, 0.72)} 100%)`,
              color: theme.accentText,
            }}
            aria-hidden="true"
          >
            <ListTodo className="h-4 w-4" />
          </div>
        </div>

        <div className="relative z-20 flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleTogglePinned}
            className={`flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-all hover:scale-105 hover:bg-black/5 hover:text-slate-900 active:scale-95 ${
              isCollapsed ? "-rotate-6" : ""
            }`}
            style={{
              color: isPinned ? theme.accent : undefined,
            }}
            title={isPinned ? "取消置顶" : "置顶浮窗"}
            aria-label={isPinned ? "取消置顶" : "置顶浮窗"}
          >
            <Pin className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowThemePicker((value) => !value)}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
            title="浮窗颜色"
            aria-label="浮窗颜色"
          >
            <Palette className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setShowThemePicker(false);
              setIsCollapsed((value) => !value);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
            title={isCollapsed ? "展开浮窗" : "折叠浮窗"}
            aria-label={isCollapsed ? "展开浮窗" : "折叠浮窗"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
          </button>
          <button
            onClick={() => void handleOpenMainWindow()}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
            title="打开主窗口"
            aria-label="打开主窗口"
          >
            <House className="h-4 w-4" />
          </button>
          <button
            onClick={() => void getCurrentWindow().close()}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-black/5 hover:text-slate-900"
            title="关闭浮窗"
            aria-label="关闭浮窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showThemePicker && (
          <div
            className="overflow-hidden border-b border-black/5 px-3 py-2 animate-in fade-in slide-in-from-top-1"
            style={{ backgroundColor: theme.surfaceAlt }}
          >
            <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">Theme</div>
            <div className="flex flex-wrap items-center gap-2">
              {FLOATING_THEMES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedThemeId(item.id)}
                  className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] transition-all ${
                    selectedThemeId === item.id ? "ring-1 ring-black/10" : ""
                  }`}
                  style={{
                    backgroundColor: item.surface,
                    color: item.accent,
                  }}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.accent }}
                  />
                  {item.label}
                </button>
              ))}
            </div>
            {selectedThemeId === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={customAccent}
                  onChange={(event) => setCustomAccent(event.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border border-black/10 bg-transparent p-1"
                  title="选择任意颜色"
                />
                <input
                  type="text"
                  value={customAccent}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    const normalized = value.startsWith("#") ? value : `#${value}`;
                    if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
                      setCustomAccent(normalized);
                    }
                  }}
                  className="h-8 flex-1 rounded-lg border border-black/10 bg-white/85 px-2.5 text-[12px] outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="#475569"
                  maxLength={7}
                />
              </div>
            )}
          </div>
        )}

        {shouldRenderContent && (
          <div
            key="floating-content"
            className={`flex min-h-0 flex-1 origin-top flex-col overflow-hidden transition-[opacity,transform,filter] duration-300 ease-out ${
              isContentVisible
                ? "translate-y-0 scale-100 opacity-100 blur-0"
                : "pointer-events-none -translate-y-2 scale-[0.985] opacity-0 blur-[1px]"
            }`}
          >
            <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
              <div
                className="rounded-2xl px-3 py-2 shadow-sm ring-1 ring-black/5"
                style={{ backgroundColor: theme.surface }}
              >
                <div className="text-[10px] text-slate-500">今日待完成</div>
                <div className="mt-1 text-xl font-semibold leading-none">{pendingTasks.length}</div>
              </div>
              <div
                className="rounded-2xl px-3 py-2 text-white shadow-sm"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
              >
                <div className="text-[10px] text-white/70">总完成度</div>
                <div className="mt-1 text-xl font-semibold leading-none">{completionRate}</div>
              </div>
            </div>

            <div className="px-3 pb-2">
              <button
                onClick={() => setOnlyPending((value) => !value)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[11px] transition-all hover:-translate-y-0.5 active:scale-[0.985] ring-1 ring-black/5"
                style={
                  onlyPending
                    ? { backgroundColor: theme.accent, color: theme.accentText }
                    : { backgroundColor: theme.surface, color: "#475569" }
                }
              >
                <EyeOff className="h-3.5 w-3.5" />
                {onlyPending ? "当前仅看未完成" : "显示全部今日任务"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Today</div>
                <div className="text-[10px] text-slate-400">
                  {visibleTasks.length} / {todayTasks.length} 项
                </div>
              </div>
              <div className="space-y-1.5">
                {visibleTasks.length > 0 ? (
                  visibleTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => void onToggle(task.id)}
                      className="flex w-full select-none items-start gap-2.5 rounded-2xl px-3 py-2.5 text-left shadow-sm ring-1 ring-black/5 transition-all hover:-translate-y-0.5 hover:scale-[1.01] active:scale-[0.98]"
                      style={{
                        backgroundColor: task.completed ? theme.surfaceAlt : theme.surface,
                        color: task.completed ? "#94a3b8" : "#0f172a",
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: indicatorColor,
                          backgroundColor: task.completed ? indicatorColor : "transparent",
                        }}
                      >
                        {task.completed && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`text-[13px] leading-5 ${task.completed ? "line-through" : "font-medium"}`}>
                          {task.title}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          {task.delayed && (
                            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-600">
                              延迟任务
                            </span>
                          )}
                          {task.category && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px]"
                              style={{ backgroundColor: `${task.colorHex}1f`, color: task.colorHex }}
                            >
                              {task.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div
                    className="rounded-3xl px-4 py-7 text-center text-sm text-slate-500 shadow-sm ring-1 ring-black/5"
                    style={{ backgroundColor: theme.surface }}
                  >
                    {onlyPending ? "今天待办已经清空了。" : "今天还没有任务，去主窗口加一条吧。"}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
