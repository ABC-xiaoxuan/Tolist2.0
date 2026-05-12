import { useEffect, useRef, useState } from "react";
import type { MascotReaction, MascotReactionType } from "../types";
import mascotSprite from "../../assets/mascot-sprite.png";

interface MascotPetProps {
  completionRate: number;
  reaction: MascotReaction;
}

const reactionText: Record<MascotReactionType, string> = {
  idle: "陪你完成今天",
  "task-added": "收到新任务",
  "task-completed": "完成得漂亮",
  "task-updated": "我记住啦",
  "task-deleted": "任务收纳好了",
  "tasks-cleared": "清爽重启",
  "examples-loaded": "样例已就位",
  "pet-touched": "我在这里",
};

const spriteColumns = 5;
const spriteRows = 3;

const reactionFrames: Record<MascotReactionType, number[]> = {
  idle: [0, 0, 1, 0, 0],
  "task-added": [3, 7, 2, 7, 0],
  "task-completed": [12, 4, 2, 14, 4],
  "task-updated": [7, 13, 7, 0],
  "task-deleted": [5, 6, 5, 0],
  "tasks-cleared": [8, 9, 8, 0],
  "examples-loaded": [13, 7, 2, 0],
  "pet-touched": [1, 10, 11, 4, 1],
};

const reactionDuration: Record<MascotReactionType, number> = {
  idle: 3800,
  "task-added": 1450,
  "task-completed": 1650,
  "task-updated": 1350,
  "task-deleted": 1400,
  "tasks-cleared": 1450,
  "examples-loaded": 1550,
  "pet-touched": 1650,
};

const frameAnimationName: Record<MascotReactionType, string> = {
  idle: "mascotFramesIdle",
  "task-added": "mascotFramesTaskAdded",
  "task-completed": "mascotFramesTaskCompleted",
  "task-updated": "mascotFramesTaskUpdated",
  "task-deleted": "mascotFramesTaskDeleted",
  "tasks-cleared": "mascotFramesTasksCleared",
  "examples-loaded": "mascotFramesExamplesLoaded",
  "pet-touched": "mascotFramesPetTouched",
};

function getFramePosition(frame: number) {
  const frameColumn = frame % spriteColumns;
  const frameRow = Math.floor(frame / spriteColumns);

  return `${(frameColumn / (spriteColumns - 1)) * 100}% ${(frameRow / (spriteRows - 1)) * 100}%`;
}

function createFrameKeyframes(name: string, frames: number[]) {
  const frameCount = frames.length;
  const frameBlocks = frames
    .map((frame, index) => {
      const start = (index / frameCount) * 100;
      const end = index === frameCount - 1 ? 100 : ((index + 1) / frameCount) * 100 - 0.01;
      return `${start.toFixed(2)}%, ${end.toFixed(2)}% { background-position: ${getFramePosition(frame)}; }`;
    })
    .join("\n");

  return `@keyframes ${name} { ${frameBlocks} }`;
}

const spriteFrameKeyframes = (Object.keys(reactionFrames) as MascotReactionType[])
  .map((type) => createFrameKeyframes(frameAnimationName[type], reactionFrames[type]))
  .join("\n");

export function MascotPet({ completionRate, reaction }: MascotPetProps) {
  const [touchReaction, setTouchReaction] = useState<MascotReaction | null>(null);
  const [visualType, setVisualType] = useState<MascotReactionType>("idle");
  const touchTimeoutRef = useRef<number | null>(null);
  const lift = completionRate >= 100 ? -4 : completionRate >= 60 ? -2 : 0;
  const activeReaction = touchReaction ?? reaction;
  const activeType = activeReaction.type;
  const isActive = visualType !== "idle" && activeReaction.token > 0;
  const spriteAnimation =
    visualType === "idle"
      ? "mascotSpriteFloat 3.6s ease-in-out infinite"
      : visualType === "task-completed" || visualType === "task-added" || visualType === "examples-loaded"
        ? "mascotSpritePop 760ms cubic-bezier(.2,.85,.2,1), mascotSpriteFloat 3.6s ease-in-out 760ms infinite"
        : visualType === "task-deleted" || visualType === "tasks-cleared"
          ? "mascotSpriteSway 760ms ease-out, mascotSpriteFloat 3.6s ease-in-out 760ms infinite"
          : "mascotSpriteNod 680ms ease-out, mascotSpriteFloat 3.6s ease-in-out 680ms infinite";
  const frameAnimation = `${frameAnimationName[visualType]} ${reactionDuration[visualType]}ms linear ${
    visualType === "idle" ? "infinite" : "both"
  }`;

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
    return () => {
      if (touchTimeoutRef.current !== null) {
        window.clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

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
    <button
      type="button"
      onClick={handleTouch}
      className="relative w-full overflow-hidden rounded-lg border border-primary/16 bg-primary/6 p-1.5 text-left shadow-sm transition-transform hover:scale-[1.015] active:scale-[0.985]"
      title="和电子宠物互动"
    >
      <style>
        {`
          ${spriteFrameKeyframes}
          @keyframes mascotSpriteFloat {
            0%, 100% { transform: translateY(${lift}px) rotate(-1deg) scale(1); }
            50% { transform: translateY(${lift - 4}px) rotate(1deg) scale(1.015); }
          }
          @keyframes mascotSpriteGlow {
            0%, 100% { opacity: 0.38; transform: translateX(-50%) scale(0.94); }
            50% { opacity: 0.72; transform: translateX(-50%) scale(1); }
          }
          @keyframes mascotSpritePop {
            0% { transform: translateY(${lift}px) scale(1) rotate(0deg); }
            34% { transform: translateY(${lift - 11}px) scale(1.05) rotate(-4deg); }
            62% { transform: translateY(${lift + 1}px) scale(0.99) rotate(3deg); }
            100% { transform: translateY(${lift}px) scale(1) rotate(0deg); }
          }
          @keyframes mascotSpriteNod {
            0% { transform: translateY(${lift}px) rotate(0deg); }
            28% { transform: translateY(${lift - 5}px) rotate(-3deg); }
            56% { transform: translateY(${lift - 3}px) rotate(3deg); }
            100% { transform: translateY(${lift}px) rotate(0deg); }
          }
          @keyframes mascotSpriteSway {
            0% { transform: translateY(${lift}px) translateX(0) scale(1); opacity: 1; }
            28% { transform: translateY(${lift + 2}px) translateX(-4px) scale(0.98); opacity: 0.92; }
            56% { transform: translateY(${lift + 1}px) translateX(4px) scale(1.01); opacity: 1; }
            100% { transform: translateY(${lift}px) translateX(0) scale(1); opacity: 1; }
          }
          @keyframes mascotBubble {
            0% { opacity: 0; transform: translateY(8px) scale(0.92); }
            18%, 74% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-6px) scale(0.98); }
          }
          @keyframes mascotBurst {
            0% { opacity: 0; transform: translateY(8px) scale(0.5) rotate(0deg); }
            28% { opacity: 1; transform: translateY(0) scale(1) rotate(12deg); }
            100% { opacity: 0; transform: translateY(-18px) scale(0.65) rotate(32deg); }
          }
          @keyframes mascotHeartFloat {
            0% { opacity: 0; transform: translateY(10px) scale(0.65) rotate(-8deg); }
            24% { opacity: 1; transform: translateY(0) scale(1) rotate(5deg); }
            100% { opacity: 0; transform: translateY(-24px) scale(0.72) rotate(15deg); }
          }
        `}
      </style>

      <div className="relative h-[148px] overflow-hidden rounded-md bg-gradient-to-b from-yellow/25 via-white to-primary/8">
        <div
          className="pointer-events-none absolute left-1/2 top-5 h-24 w-24 -translate-x-1/2 rounded-full bg-primary/18 blur-xl"
          style={{ animation: "mascotSpriteGlow 3.2s ease-in-out infinite" }}
        />
        <div
          key={`bubble-${activeType}-${activeReaction.token}`}
          className={`pointer-events-none absolute left-2 top-2 z-30 rounded-full border border-white/80 bg-white/92 px-2 py-1 text-[10px] leading-none text-foreground/75 shadow-sm ${
            isActive ? "" : "opacity-0"
          }`}
          style={{ animation: isActive ? "mascotBubble 2.3s ease-out both" : undefined }}
        >
          {reactionText[activeType]}
        </div>
        <div className="absolute left-1/2 top-2 z-10 h-[126px] w-[126px] -translate-x-1/2">
          <div
            key={`pet-motion-${visualType}-${activeReaction.token}`}
            className="h-full w-full"
            style={{ animation: spriteAnimation, transformOrigin: "50% 78%" }}
          >
            <div
              aria-label="Q版电子宠物"
              className="h-full w-full select-none bg-no-repeat"
              style={{
                backgroundImage: `url(${mascotSprite})`,
                backgroundPosition: getFramePosition(reactionFrames[visualType][0] ?? 0),
                backgroundSize: `${spriteColumns * 100}% ${spriteRows * 100}%`,
                animation: frameAnimation,
              }}
            />
          </div>
        </div>
        {visualType === "task-completed" && (
          <div
            key={`burst-${activeReaction.token}`}
            className="pointer-events-none absolute right-8 top-8 z-30 text-base text-primary"
            style={{ animation: "mascotBurst 1.2s ease-out both" }}
          >
            +
          </div>
        )}
        {(visualType === "task-completed" || visualType === "pet-touched") && (
          <div
            key={`heart-${activeReaction.token}`}
            className="pointer-events-none absolute left-9 top-10 z-30 text-sm text-rose-400"
            style={{ animation: "mascotHeartFloat 1.35s ease-out both" }}
          >
            ♥
          </div>
        )}
        {(visualType === "task-added" || visualType === "examples-loaded") && (
          <div
            key={`dot-${activeReaction.token}`}
            className="pointer-events-none absolute right-8 top-9 z-30 h-2 w-2 rounded-full bg-primary"
            style={{ animation: "mascotBurst 1.1s ease-out both" }}
          />
        )}
        {(visualType === "task-updated" || visualType === "pet-touched") && (
          <div
            key={`ring-${activeReaction.token}`}
            className="pointer-events-none absolute right-7 top-8 z-30 h-4 w-4 rounded-full border-2 border-primary"
            style={{ animation: "mascotBurst 1.15s ease-out both" }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-white/45 to-transparent" />
        <div className="pointer-events-none absolute right-2 top-2 z-20 h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
      </div>
    </button>
  );
}
