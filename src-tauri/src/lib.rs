use std::fs;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    window::Color,
    Listener, Manager,
};
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn backup_database(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let source_path = app
        .path()
        .app_config_dir()
        .map(|path| path.join("tasks.db"))
        .map_err(|error| error.to_string())?;

    fs::copy(source_path, file_path)
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn write_text_file(file_path: String, contents: String) -> Result<(), String> {
    fs::write(file_path, contents).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_tasks_table",
            sql: r#"
          CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            completed INTEGER NOT NULL DEFAULT 0,
            time TEXT NOT NULL,
            category TEXT,
            color TEXT NOT NULL,
            color_hex TEXT NOT NULL,
            task_date TEXT NOT NULL,
            priority TEXT NOT NULL DEFAULT 'medium',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_task_query_indexes",
            sql: r#"
              CREATE INDEX IF NOT EXISTS idx_tasks_task_date ON tasks(task_date);
              CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
              CREATE INDEX IF NOT EXISTS idx_tasks_task_date_completed ON tasks(task_date, completed);
              CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_delayed_task_marker",
            sql: r#"
              ALTER TABLE tasks ADD COLUMN is_delayed INTEGER NOT NULL DEFAULT 0;
              CREATE INDEX IF NOT EXISTS idx_tasks_delayed ON tasks(is_delayed);
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:tasks.db", migrations)
                .build(),
        )
        .setup(|app| {
            let show_item = MenuItemBuilder::with_id("show-main", "显示主窗口").build(app)?;
            let hide_item = MenuItemBuilder::with_id("hide-main", "隐藏主窗口").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit-app", "退出").build(app)?;

            let tray_menu = MenuBuilder::new(app)
                .items(&[&show_item, &hide_item, &quit_item])
                .build()?;

            let tray_icon = app.default_window_icon().cloned();

            TrayIconBuilder::with_id("main-tray")
                .icon(tray_icon.expect("default tray icon should exist"))
                .tooltip("我的待办")
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.set_skip_taskbar(false);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show-main" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.set_skip_taskbar(false);
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide-main" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    "quit-app" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // 设置主窗口 WebView 背景为透明，确保圆角四角不出现白色直角
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
            }

            // 监听动态创建的窗口（如浮窗），同样设置透明背景
            let app_handle = app.handle().clone();
            app.listen("tauri://window-created", move |_| {
                if let Some(window) = app_handle.get_webview_window("floating") {
                    let _ = window.set_background_color(Some(Color(0, 0, 0, 0)));
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![backup_database, write_text_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
