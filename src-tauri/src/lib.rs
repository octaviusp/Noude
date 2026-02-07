mod commands;
mod error;
mod process_manager;
mod streaming;

use process_manager::ProcessManager;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pm = Arc::new(ProcessManager::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Enforce frameless mode at runtime for consistency across dev/build runs.
                let _ = window.set_decorations(false);
            }
            Ok(())
        })
        .manage(pm)
        .invoke_handler(tauri::generate_handler![
            commands::claude::invoke_claude,
            commands::bash::invoke_bash,
            commands::process::cancel_process,
            commands::process::cancel_all_processes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
