import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Pin, PinOff, Sparkles, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { MascotReaction, MascotReactionType } from "../types";
import mascotSprite from "../../assets/mascot-sprite-pixel.png";

interface DesktopMascotProps {
  reaction: MascotReaction;
  themeColor: string;
}

const spriteColumns = 5;
const spriteRows = 3;
const DRAG_THRESHOLD = 6;
const DRAG_START_DELAY = 120;

const reactionText: Record<MascotReactionType, string> = {
  idle: "我在桌面陪你",
  "task-added": "新任务收到",
  "task-completed": "完成得漂亮",
  "task-updated": "我记住啦",
  "task-deleted": "任务收纳好了",
  "tasks-cleared": "清爽重启",
  "examples-loaded": "样例已就位",
  "break-reminder": "起来活动一下",
  "pet-touched": "我在这里",
};

const reactionFrames: Record<MascotReactionType, number[]> = {
  idle: [0, 0, 1, 0, 0],
  "task-added": [3, 7, 2, 7, 0],
  "task-completed": [12, 4, 2, 14, 4],
  "task-updated": [7, 13, 7, 0],
  "task-deleted": [5, 6, 5, 0],
  "tasks-cleared": [8, 9, 8, 0],
  "examples-loaded": [13, 7, 2, 0],
  "break-reminder": [1, 10, 11, 4, 1],
  "pet-touched": [1, 10, 11, 4, 1],
};

const reactionDuration: Record<MascotReactionType, number> = {
  idle: 3600,
  "task-added": 1450,
  "task-completed": 1650,
  "task-updated": 1350,
  "task-deleted": 1400,
  "tasks-cleared": 1450,
  "examples-loaded": 1550,
  "break-reminder": 1700,
  "pet-touched": 1650,
};

const frameAnimationName: Record<MascotReactionType, string> = {
  idle: "desktopMascotFramesIdle",
  "task-added": "desktopMascotFramesTaskAdded",
  "task-completed": "desktopMascotFramesTaskCompleted",
  "task-updated": "desktopMascotFramesTaskUpdated",
  "task-deleted": "desktopMascotFramesTaskDeleted",
  "tasks-cleared": "desktopMascotFramesTasksCleared",
  "examples-loaded": "desktopMascotFramesExamplesLoaded",
  "break-reminder": "desktopMascotFramesBreakReminder",
  "pet-touched": "desktopMascotFramesPetTouched",
};

function getFramePosition(frame: number) {
  const frameColumn = frame % spriteColumns;
  const frameRow = Math.floor(frame / spriteColumns);

  return `${(frameColumn / (spriteColumns - 1)) * 100}% ${(frameRow / (spriteRows - 1)) * 100}%`;
}

function createFrameKeyframes(name: string, frames: number[]) {
  const frameCount = frames.length;
  const blocks = frames
    .map((frame, index) => {
      const start = (index / frameCount) * 100;
      const end = index === frameCount - 1 ? 100 : ((index + 1) / frameCount) * 100 - 0.01;

      return `${start.toFixed(2)}%, ${end.toFixed(2)}% { background-position: ${getFramePosition(frame)}; }`;
    })
    .join("\n");

  return `@keyframes ${name} { ${blocks} }`;
}

const spriteFrameKeyframes = (Object.keys(reactionFrames) as MascotReactionType[])
  .map((type) => createFrameKeyframes(frameAnimationName[type], reactionFrames[type]))
  .join("\n");

export function DesktopMascot({ reaction, themeColor }: DesktopMascotProps) {
  const [visualType, setVisualType] = useState<MascotReactionType>("idle");
  const [touchReaction, setTouchReaction] = useState<MascotReaction | null>(null);
  const [isPinned, setIsPinned] = useState(true);
  const touchTimeoutRef = useRef<number | null>(null);
  const dragTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ x: number; y: number; dragStarted: boolean } | null>(null);
  const activeReaction = touchReaction ?? reaction;
  const activeType = activeReaction.type;
  const isActive = visualType !== "idle" && activeReaction.token > 0;
  const frameAnimation = `${frameAnimationName[visualType]} ${reactionDuration[visualType]}ms linear ${
    visualType === "idle" ? "infinite" : "both"
  }`;
  const motionAnimation =
    visualType === "idle"
      ? "desktopMascotFloat 3.4s ease-in-out infinite"
      : visualType === "task-completed" || visualType === "task-added" || visualType === "examples-loaded"
        ? "desktopMascotPop 760ms cubic-bezier(.2,.85,.2,1), desktopMascotFloat 3.4s ease-in-out 760ms infinite"
        : visualType === "task-deleted" || visualType === "tasks-cleared"
          ? "desktopMascotSway 760ms ease-out, desktopMascotFloat 3.4s ease-in-out 760ms infinite"
          : "desktopMascotNod 680ms ease-out, desktopMascotFloat 3.4s ease-in-out 680ms infinite";

  useEffect(() => {
    setVisualType(activeType);

    if (activeType === "idle" || activeReaction.token <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setVisualType("idle");
    }, reactionDuration[activeType]);

    return () => window.clearTimeout(timeoutId);
  }, [activeReaction.token, activeType]);

  useEffect(() => {
    void getCurrentWindow().setAlwaysOnTop(isPinned);
  }, [isPinned]);

  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current !== null) {
        window.clearTimeout(touchTimeoutRef.current);
      }
      if (dragTimerRef.current !== null) {
        window.clearTimeout(dragTimerRef.current);
      }
    };
  }, []);

  const clearDragTimer = () => {
    if (dragTimerRef.current !== null) {
      window.clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
  };

  const finishMouseInteraction = () => {
    const state = dragStateRef.current;
    dragStateRef.current = null;
    clearDragTimer();

    if (!state?.dragStarted) {
      handleTouch();
    }
  };

  const startDraggingIfNeeded = () => {
    const state = dragStateRef.current;
    if (!state || state.dragStarted) {
      return;
    }

    state.dragStarted = true;
    clearDragTimer();
    void getCurrentWindow().startDragging();
  };

  const handleMascotMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button")) {
      return;
    }

    if (event.button !== 0) {
      return;
    }

    dragStateRef.current = {
      x: event.clientX,
      y: event.clientY,
      dragStarted: false,
    };

    clearDragTimer();
    dragTimerRef.current = window.setTimeout(() => {
      startDraggingIfNeeded();
    }, DRAG_START_DELAY);

    window.addEventListener("mouseup", finishMouseInteraction, { once: true });
  };

  const handleMascotMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state || state.dragStarted) {
      return;
    }

    const distance = Math.hypot(event.clientX - state.x, event.clientY - state.y);
    if (distance >= DRAG_THRESHOLD) {
      startDraggingIfNeeded();
    }
  };

  const handleTouch = () => {
    const token = Date.now();

    if (touchTimeoutRef.current !== null) {
      window.clearTimeout(touchTimeoutRef.current);
    }

    setTouchReaction({ type: "pet-touched", token });
    touchTimeoutRef.current = window.setTimeout(() => {
      setTouchReaction((current) => (current?.token === token ? null : current));
      touchTimeoutRef.current = null;
    }, 1800);
  };

  return (
    <div
      className="group relative flex size-full select-none items-center justify-center overflow-hidden bg-transparent"
    >
      <style>
        {`
          ${spriteFrameKeyframes}
          @keyframes desktopMascotFloat {
            0%, 100% { transform: translateY(0) rotate(-1deg) scale(1); }
            50% { transform: translateY(-7px) rotate(1deg) scale(1.018); }
          }
          @keyframes desktopMascotPop {
            0% { transform: translateY(0) scale(1) rotate(0deg); }
            34% { transform: translateY(-14px) scale(1.06) rotate(-4deg); }
            62% { transform: translateY(2px) scale(0.99) rotate(3deg); }
            100% { transform: translateY(0) scale(1) rotate(0deg); }
          }
          @keyframes desktopMascotNod {
            0% { transform: translateY(0) rotate(0deg); }
            28% { transform: translateY(-6px) rotate(-3deg); }
            56% { transform: translateY(-3px) rotate(3deg); }
            100% { transform: translateY(0) rotate(0deg); }
          }
          @keyframes desktopMascotSway {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
            28% { transform: translateY(2px) translateX(-5px) scale(0.98); opacity: 0.94; }
            56% { transform: translateY(1px) translateX(5px) scale(1.01); opacity: 1; }
            100% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          }
          @keyframes desktopMascotBubble {
            0% { opacity: 0; transform: translateY(8px) scale(0.92); }
            18%, 74% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-8px) scale(0.98); }
          }
          @keyframes desktopMascotHeart {
            0% { opacity: 0; transform: translateY(10px) scale(0.65) rotate(-8deg); }
            24% { opacity: 1; transform: translateY(0) scale(1) rotate(5deg); }
            100% { opacity: 0; transform: translateY(-26px) scale(0.72) rotate(15deg); }
          }
          @keyframes desktopMascotSpark {
            0% { opacity: 0; transform: translateY(8px) scale(0.5) rotate(0deg); }
            28% { opacity: 1; transform: translateY(0) scale(1) rotate(12deg); }
            100% { opacity: 0; transform: translateY(-18px) scale(0.65) rotate(32deg); }
          }
        `}
      </style>

      <div
        className={`pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-full border border-slate-900/70 bg-white/92 px-2.5 py-0.5 font-mono text-[10px] leading-4 text-slate-800 shadow-sm ${
          isActive ? "" : "opacity-0"
        }`}
        style={{ animation: isActive ? "desktopMascotBubble 2.25s ease-out both" : undefined }}
      >
        {reactionText[activeType]}
      </div>

      <div
        className="pointer-events-none absolute right-1.5 top-1.5 z-40 flex items-center gap-0.5 rounded-full border border-slate-900/35 bg-white/86 p-0.5 opacity-0 shadow-sm backdrop-blur transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-90 group-focus-within:pointer-events-auto group-focus-within:opacity-90"
      >
        <button
          type="button"
          onClick={() => {
            setIsPinned((value) => !value);
          }}
          className="flex h-5 w-5 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white hover:text-slate-950"
          title={isPinned ? "取消置顶" : "置顶桌宠"}
          aria-label={isPinned ? "取消置顶" : "置顶桌宠"}
        >
          {isPinned ? <Pin className="h-3 w-3" /> : <PinOff className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={() => {
            handleTouch();
          }}
          className="flex h-5 w-5 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white hover:text-slate-950"
          title="互动一下"
          aria-label="互动一下"
        >
          <Sparkles className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => void getCurrentWindow().close()}
          className="flex h-5 w-5 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-white hover:text-red-500"
          title="关闭桌宠"
          aria-label="关闭桌宠"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <div
        className="pointer-events-none absolute bottom-8 left-1/2 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-900/16 blur-[3px]"
        aria-hidden="true"
      />

      <div
        className="relative z-10 mt-6 h-[132px] w-[132px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMascotMouseDown}
        onMouseMove={handleMascotMouseMove}
        title="点击互动，拖动可移动"
      >
        <div
          key={`desktop-mascot-motion-${visualType}-${activeReaction.token}`}
          className="h-full w-full"
          style={{ animation: motionAnimation, transformOrigin: "50% 80%" }}
        >
          <div
            aria-label="桌面Q版人物"
            className="h-full w-full bg-no-repeat drop-shadow-[4px_4px_0_rgba(15,23,42,0.26)]"
            style={{
              backgroundImage: `url(${mascotSprite})`,
              backgroundPosition: getFramePosition(reactionFrames[visualType][0] ?? 0),
              backgroundSize: `${spriteColumns * 100}% ${spriteRows * 100}%`,
              animation: frameAnimation,
              imageRendering: "pixelated",
            }}
          />
        </div>
      </div>

      {(visualType === "task-completed" || visualType === "pet-touched") && (
        <div
          key={`desktop-mascot-heart-${activeReaction.token}`}
          className="pointer-events-none absolute left-8 top-16 z-30 font-mono text-base text-rose-500"
          style={{ animation: "desktopMascotHeart 1.35s ease-out both" }}
        >
          ♥
        </div>
      )}
      {(visualType === "task-added" || visualType === "task-completed" || visualType === "examples-loaded") && (
        <div
          key={`desktop-mascot-spark-${activeReaction.token}`}
          className="pointer-events-none absolute right-8 top-16 z-30 font-mono text-base"
          style={{ animation: "desktopMascotSpark 1.15s ease-out both", color: themeColor }}
        >
          +
        </div>
      )}
    </div>
  );
}
