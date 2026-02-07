mod commands;
mod error;
mod process_manager;
mod streaming;

use process_manager::ProcessManager;
use std::sync::Arc;
use tauri::{Manager, RunEvent};
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pm = Arc::new(ProcessManager::new());
    let pm_cleanup = Arc::clone(&pm);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    // Use native macOS traffic lights with integrated overlay titlebar.
                    let _ = window.set_decorations(true);
                    let _ = window.set_title_bar_style(TitleBarStyle::Overlay);
                }
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
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(move |_app, event| {
            if let RunEvent::Exit = event {
                pm_cleanup.cancel_all();
            }
        });
}
