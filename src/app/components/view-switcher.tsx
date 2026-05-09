import { Calendar, CalendarDays, CalendarRange } from "lucide-react";
import type { ReactNode } from "react";
import { ViewType } from "../types";

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const views: { type: ViewType; icon: ReactNode; label: string }[] = [
    { type: "day", icon: <Calendar className="w-5 h-5" />, label: "日" },
    { type: "week", icon: <CalendarDays className="w-5 h-5" />, label: "周" },
    { type: "month", icon: <CalendarRange className="w-5 h-5" />, label: "月" },
  ];

  return (
    <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-border">
      {views.map((view) => (
        <button
          key={view.type}
          onClick={() => onViewChange(view.type)}
          className={`relative flex items-center gap-2 rounded-lg px-6 py-2.5 transition-all hover:scale-105 active:scale-95 ${
            currentView === view.type ? "bg-primary" : ""
          }`}
        >
          <span className={`relative z-10 flex items-center gap-2 ${
            currentView === view.type ? "text-primary-foreground" : "text-foreground"
          }`}>
            {view.icon}
            <span>{view.label}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
