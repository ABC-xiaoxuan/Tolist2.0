import Database from "@tauri-apps/plugin-sql";
import { format } from "date-fns";
import { invoke } from "@tauri-apps/api/core";
import {
  CategoryStat,
  DashboardStats,
  Task,
  TaskDraft,
  TaskPriority,
  WeeklyStat,
} from "./types";

const DB_URL = "sqlite:tasks.db";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  completed: number;
  time: string | null;
  category: string | null;
  color: string;
  color_hex: string;
  task_date: string;
  priority: TaskPriority | null;
};

type SummaryRow = {
  total_count: number | null;
  completed_count: number | null;
};

type WeeklyRow = {
  day_key: string;
  completed_count: number;
};

type CategoryRow = {
  name: string;
  value: number;
  color: string | null;
};

let dbPromise: Promise<Database> | null = null;

function getTaskDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL);
  }

  return dbPromise;
}

function mapRowToTask(row: TaskRow): Task {
  const dateValue = row.task_date.includes("T")
    ? new Date(row.task_date)
    : new Date(`${row.task_date}T00:00:00`);

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: Boolean(row.completed),
    time: row.time ?? undefined,
    category: row.category ?? undefined,
    color: row.color,
    colorHex: row.color_hex,
    date: dateValue,
    priority: row.priority ?? "medium",
  };
}

function mapDraftToBindValues(taskDraft: TaskDraft) {
  return [
    taskDraft.title.trim(),
    taskDraft.description.trim() || null,
    "",
    taskDraft.category.trim() || null,
    taskDraft.color,
    taskDraft.colorHex,
    taskDraft.date,
    taskDraft.priority,
  ];
}

export async function listTasks() {
  const db = await getDb();
  const rows = await db.select<TaskRow[]>(
    `SELECT
      id,
      title,
      description,
      completed,
      time,
      category,
      color,
      color_hex,
      task_date,
      priority
    FROM tasks
    ORDER BY
      CASE
        WHEN instr(task_date, 'T') > 0 THEN substr(task_date, 1, 10)
        ELSE task_date
      END ASC,
      created_at ASC`
  );

  return rows.map(mapRowToTask);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();
  const today = new Date();
  const weeklyKeys = Array.from({ length: 7 }, (_, index) =>
    getTaskDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6 + index))
  );

  const [summaryRows, weeklyRows, categoryRows] = await Promise.all([
    db.select<SummaryRow[]>(
      `SELECT
        COUNT(*) AS total_count,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_count
      FROM tasks`
    ),
    db.select<WeeklyRow[]>(
      `SELECT
        CASE
          WHEN instr(task_date, 'T') > 0 THEN substr(task_date, 1, 10)
          ELSE task_date
        END AS day_key,
        COUNT(*) AS completed_count
      FROM tasks
      WHERE completed = 1
        AND CASE
          WHEN instr(task_date, 'T') > 0 THEN substr(task_date, 1, 10)
          ELSE task_date
        END BETWEEN ? AND ?
      GROUP BY day_key
      ORDER BY day_key ASC`,
      [weeklyKeys[0], weeklyKeys[weeklyKeys.length - 1]]
    ),
    db.select<CategoryRow[]>(
      `SELECT
        COALESCE(NULLIF(TRIM(category), ''), '未分类') AS name,
        COUNT(*) AS value,
        MIN(color_hex) AS color
      FROM tasks
      GROUP BY COALESCE(NULLIF(TRIM(category), ''), '未分类')
      ORDER BY value DESC, name ASC`
    ),
  ]);

  const summary = summaryRows[0] ?? { total_count: 0, completed_count: 0 };
  const weeklyMap = new Map(weeklyRows.map((row) => [row.day_key, row.completed_count]));

  const weeklyData: WeeklyStat[] = weeklyKeys.map((dayKey) => ({
    dayKey,
    completed: weeklyMap.get(dayKey) ?? 0,
  }));

  const categoryData: CategoryStat[] = categoryRows.map((row) => ({
    name: row.name,
    value: row.value,
    color: row.color ?? "#94A3B8",
  }));

  return {
    totalCount: Number(summary.total_count ?? 0),
    completedCount: Number(summary.completed_count ?? 0),
    weeklyData,
    categoryData,
  };
}

export async function getDashboardSummary(): Promise<DashboardStats> {
  const db = await getDb();
  const rows = await db.select<SummaryRow[]>(
    `SELECT
      COUNT(*) AS total_count,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_count
    FROM tasks`
  );
  const summary = rows[0] ?? { total_count: 0, completed_count: 0 };

  return {
    totalCount: Number(summary.total_count ?? 0),
    completedCount: Number(summary.completed_count ?? 0),
    weeklyData: [],
    categoryData: [],
  };
}

export async function createTask(taskDraft: TaskDraft) {
  const db = await getDb();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO tasks (
      id,
      title,
      description,
      completed,
      time,
      category,
      color,
      color_hex,
      task_date,
      priority
    ) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [id, ...mapDraftToBindValues(taskDraft)]
  );

  return id;
}

export async function updateTask(id: string, taskDraft: TaskDraft) {
  const db = await getDb();
  await db.execute(
    `UPDATE tasks
    SET
      title = ?,
      description = ?,
      time = ?,
      category = ?,
      color = ?,
      color_hex = ?,
      task_date = ?,
      priority = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`,
    [...mapDraftToBindValues(taskDraft), id]
  );
}

export async function updateTaskCompletion(id: string, completed: boolean) {
  const db = await getDb();
  await db.execute(
    "UPDATE tasks SET completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [completed ? 1 : 0, id]
  );
}

export async function deleteTask(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM tasks WHERE id = ?", [id]);
}

export async function clearTasks() {
  const db = await getDb();
  await db.execute("DELETE FROM tasks");
}

export async function seedExampleTasks() {
  const db = await getDb();
  const today = new Date();
  const samples: TaskDraft[] = [
    {
      title: "完成项目提案",
      description: "准备 Q2 季度产品规划提案",
      category: "工作",
      color: "coral",
      colorHex: "#FF6B6B",
      date: getTaskDateKey(today),
      priority: "high",
    },
    {
      title: "团队会议",
      description: "周会：讨论本周进度",
      category: "工作",
      color: "teal",
      colorHex: "#26C6DA",
      date: getTaskDateKey(today),
      priority: "medium",
    },
    {
      title: "健身房训练",
      description: "力量训练 + 有氧",
      category: "生活",
      color: "purple",
      colorHex: "#A78BFA",
      date: getTaskDateKey(today),
      priority: "low",
    },
    {
      title: "阅读技术文章",
      description: "学习 React 最新特性",
      category: "学习",
      color: "yellow",
      colorHex: "#FFF59D",
      date: getTaskDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)),
      priority: "medium",
    },
    {
      title: "代码评审",
      description: "审查团队成员的 PR",
      category: "工作",
      color: "orange",
      colorHex: "#FB923C",
      date: getTaskDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2)),
      priority: "high",
    },
  ];

  const placeholders = samples.map(() => "(?, ?, ?, 0, ?, ?, ?, ?, ?, ?)").join(", ");
  const values = samples.flatMap((s) => [crypto.randomUUID(), ...mapDraftToBindValues(s)]);

  await db.execute(
    `INSERT INTO tasks (id, title, description, completed, time, category, color, color_hex, task_date, priority) VALUES ${placeholders}`,
    values
  );
}

export async function exportTasksJson(filePath: string) {
  const tasks = await listTasks();
  await invoke("write_text_file", {
    filePath,
    contents: JSON.stringify(tasks, null, 2),
  });
}

export async function backupDatabase(filePath: string) {
  await invoke("backup_database", { filePath });
}
