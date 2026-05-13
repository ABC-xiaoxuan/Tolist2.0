export type ReminderMode = "none" | "due" | "5m" | "30m" | "custom";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  time?: string;
  category?: string;
  color: string;
  colorHex: string;
  date: Date;
  delayed: boolean;
  dueAt?: string;
  reminderMode: ReminderMode;
  reminderAt?: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  category: string;
  color: string;
  colorHex: string;
  date: string;
  dueAt?: string;
  reminderMode: ReminderMode;
  reminderAt?: string;
}

export interface WeeklyStat {
  dayKey: string;
  completed: number;
}

export interface CategoryStat {
  name: string;
  value: number;
  color: string;
}

export interface DashboardStats {
  totalCount: number;
  completedCount: number;
  delayedCount: number;
  weeklyData: WeeklyStat[];
  categoryData: CategoryStat[];
}

export type ViewType = "day" | "week" | "month";

export type UpdateProgressPhase =
  | "idle"
  | "checking"
  | "available"
  | "downloading"
  | "installing"
  | "restarting"
  | "done"
  | "error";

export interface UpdateProgressState {
  phase: UpdateProgressPhase;
  version?: string;
  downloadedBytes: number;
  totalBytes?: number;
  message: string;
}

export type MascotReactionType =
  | "idle"
  | "task-added"
  | "task-completed"
  | "task-updated"
  | "task-deleted"
  | "tasks-cleared"
  | "examples-loaded"
  | "break-reminder"
  | "pet-touched";

export interface MascotReaction {
  type: MascotReactionType;
  token: number;
}
