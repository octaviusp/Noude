use crate::error::AppError;
use crate::process_manager::ProcessManager;
use crate::streaming::ProcessEvent;
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::State;
use tokio::io::AsyncBufReadExt;
use tokio::sync::watch;
use uuid::Uuid;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexInvokeArgs {
    pub prompt: String,
    pub model: Option<String>,
    pub full_auto: Option<bool>,
    pub sandbox_mode: Option<String>,
    pub json_output: Option<bool>,
    pub working_directory: Option<String>,
    pub additional_dirs: Option<Vec<String>>,
    pub output_last_message: Option<String>,
    pub timeout_ms: Option<u64>,
}

#[tauri::command]
pub async fn invoke_codex(
    args: CodexInvokeArgs,
    on_event: Channel<ProcessEvent>,
    process_manager: State<'_, Arc<ProcessManager>>,
) -> Result<String, AppError> {
    let process_id = Uuid::new_v4().to_string();

    let mut cmd_args: Vec<String> = vec!["exec".into(), args.prompt.clone()];

    if let Some(ref model) = args.model {
        cmd_args.extend(["-m".into(), model.clone()]);
    }

    if args.full_auto.unwrap_or(false) {
        cmd_args.push("--full-auto".into());
    }

    if let Some(ref mode) = args.sandbox_mode {
        cmd_args.extend(["-s".into(), mode.clone()]);
    }

    if args.json_output.unwrap_or(false) {
        cmd_args.push("--json".into());
    }

    if let Some(ref dirs) = args.additional_dirs {
        for dir in dirs {
            cmd_args.extend(["--add-dir".into(), dir.clone()]);
        }
    }

    if let Some(ref output_file) = args.output_last_message {
        cmd_args.extend(["-o".into(), output_file.clone()]);
    }

    let working_dir = args
        .working_directory
        .clone()
        .unwrap_or_else(|| std::env::current_dir().unwrap().to_string_lossy().to_string());

    let mut child = tokio::process::Command::new("codex")
        .args(&cmd_args)
        .current_dir(&working_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| AppError::Process(format!("Failed to spawn codex: {}", e)))?;

    let pid = child.id().unwrap_or(0);
    let _ = on_event.send(ProcessEvent::Started {
        process_id: process_id.clone(),
        pid,
    });

    let (cancel_tx, cancel_rx) = watch::channel(false);
    process_manager.register(process_id.clone(), cancel_tx);

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    let pid_clone = process_id.clone();
    let on_event_clone = on_event.clone();
    let pm = process_manager.inner().clone();
    let timeout_ms = args.timeout_ms.unwrap_or(0);

    tokio::spawn(async move {
        let mut stdout_buf = String::new();
        let mut stderr_buf = String::new();
        let mut cancel_rx = cancel_rx;

        let mut stdout_reader = tokio::io::BufReader::new(stdout).lines();
        let mut stderr_reader = tokio::io::BufReader::new(stderr).lines();

        let timeout_fut = async {
            if timeout_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(timeout_ms)).await;
                true
            } else {
                std::future::pending::<bool>().await
            }
        };
        tokio::pin!(timeout_fut);

        loop {
            tokio::select! {
                line = stdout_reader.next_line() => {
                    match line {
                        Ok(Some(l)) => {
                            stdout_buf.push_str(&l);
                            stdout_buf.push('\n');
                            let _ = on_event_clone.send(ProcessEvent::Stdout {
                                process_id: pid_clone.clone(),
                                chunk: l,
                            });
                        }
                        Ok(None) => break,
                        Err(e) => {
                            let _ = on_event_clone.send(ProcessEvent::Error {
                                process_id: pid_clone.clone(),
                                message: format!("stdout read error: {}", e),
                            });
                            break;
                        }
                    }
                }
                line = stderr_reader.next_line() => {
                    match line {
                        Ok(Some(l)) => {
                            stderr_buf.push_str(&l);
                            stderr_buf.push('\n');
                            let _ = on_event_clone.send(ProcessEvent::Stderr {
                                process_id: pid_clone.clone(),
                                chunk: l,
                            });
                        }
                        Ok(None) => {}
                        Err(_) => {}
                    }
                }
                _ = cancel_rx.changed() => {
                    if *cancel_rx.borrow() {
                        let _ = child.kill().await;
                        let _ = on_event_clone.send(ProcessEvent::Cancelled {
                            process_id: pid_clone.clone(),
                        });
                        pm.remove(&pid_clone);
                        return;
                    }
                }
                timed_out = &mut timeout_fut => {
                    if timed_out {
                        let _ = child.kill().await;
                        let _ = on_event_clone.send(ProcessEvent::Error {
                            process_id: pid_clone.clone(),
                            message: "Process timed out".to_string(),
                        });
                        pm.remove(&pid_clone);
                        return;
                    }
                }
            }
        }

        let status = child.wait().await;
        let exit_code = status.ok().and_then(|s| s.code());

        let _ = on_event_clone.send(ProcessEvent::Completed {
            process_id: pid_clone.clone(),
            exit_code,
            stdout_full: stdout_buf,
            stderr_full: stderr_buf,
        });

        pm.remove(&pid_clone);
    });

    Ok(process_id)
}
