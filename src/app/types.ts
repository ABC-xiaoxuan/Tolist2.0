export type TaskPriority = "low" | "medium" | "high";

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
  priority?: TaskPriority;
}

export interface TaskDraft {
  title: string;
  description: string;
  category: string;
  color: string;
  colorHex: string;
  date: string;
  priority: TaskPriority;
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
  weeklyData: WeeklyStat[];
  categoryData: CategoryStat[];
}

export type ViewType = "day" | "week" | "month";
