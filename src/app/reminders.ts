import type { ReminderMode } from "./types";

export const REMINDER_MODE_LABELS: Record<ReminderMode, string> = {
  none: "不提醒",
  due: "准时提醒",
  "5m": "提前 5 分钟",
  "30m": "提前 30 分钟",
  custom: "自定义时间",
};

export function parseReminderAt(reminderAt?: string) {
  if (!reminderAt) {
    return null;
  }

  const parsed = new Date(reminderAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTimeInputValue(value?: string | Date) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : parseReminderAt(value);
  if (!date) {
    return typeof value === "string" ? value.slice(0, 16) : "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function normalizeReminderMode(value?: string | null): ReminderMode {
  if (value === "due" || value === "5m" || value === "30m" || value === "custom") {
    return value;
  }

  return "none";
}

export function computeReminderAt(
  dueAt: string | undefined,
  reminderMode: ReminderMode,
  customReminderAt?: string
) {
  if (reminderMode === "none") {
    return undefined;
  }

  if (reminderMode === "custom") {
    return customReminderAt || undefined;
  }

  const dueDate = parseReminderAt(dueAt);
  if (!dueDate) {
    return undefined;
  }

  const offsetMinutes = reminderMode === "5m" ? 5 : reminderMode === "30m" ? 30 : 0;
  return formatDateTimeInputValue(new Date(dueDate.getTime() - offsetMinutes * 60_000));
}

export function formatReminderText(reminderAt?: string, compact = false) {
  const date = parseReminderAt(reminderAt);
  if (!date) {
    return "";
  }

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  if (compact && isToday) {
    return `${hours}:${minutes}`;
  }

  const dateLabel = isToday ? "今天" : `${date.getMonth() + 1}月${date.getDate()}日`;
  return `${dateLabel} ${hours}:${minutes}`;
}
