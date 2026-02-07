use crate::error::AppError;
use crate::process_manager::ProcessManager;
use std::sync::Arc;
use tauri::State;

#[tauri::command]
pub async fn cancel_process(
    process_id: String,
    process_manager: State<'_, Arc<ProcessManager>>,
) -> Result<bool, AppError> {
    Ok(process_manager.cancel(&process_id))
}

#[tauri::command]
pub async fn cancel_all_processes(
    process_manager: State<'_, Arc<ProcessManager>>,
) -> Result<(), AppError> {
    process_manager.cancel_all();
    Ok(())
}
