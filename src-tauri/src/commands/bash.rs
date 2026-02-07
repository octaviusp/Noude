use crate::error::AppError;
use crate::process_manager::ProcessManager;
use crate::streaming::ProcessEvent;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::State;
use tokio::io::AsyncBufReadExt;
use tokio::sync::watch;
use uuid::Uuid;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BashInvokeArgs {
    pub script: String,
    pub shell: Option<String>,
    pub working_directory: Option<String>,
    pub env: Option<HashMap<String, String>>,
    pub timeout_ms: Option<u64>,
}

#[tauri::command]
pub async fn invoke_bash(
    args: BashInvokeArgs,
    on_event: Channel<ProcessEvent>,
    process_manager: State<'_, Arc<ProcessManager>>,
) -> Result<String, AppError> {
    let process_id = Uuid::new_v4().to_string();
    let shell = args.shell.as_deref().unwrap_or("bash");

    let working_dir = args
        .working_directory
        .clone()
        .unwrap_or_else(|| std::env::current_dir().unwrap().to_string_lossy().to_string());

    let mut cmd = tokio::process::Command::new(shell);
    cmd.arg("-c").arg(&args.script).current_dir(&working_dir);

    if let Some(ref env) = args.env {
        cmd.envs(env);
    }

    cmd.stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| AppError::Process(format!("Failed to spawn {}: {}", shell, e)))?;

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
        let mut stdout_done = false;
        let mut stderr_done = false;

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
            if stdout_done && stderr_done {
                break;
            }

            tokio::select! {
                line = stdout_reader.next_line(), if !stdout_done => {
                    match line {
                        Ok(Some(l)) => {
                            stdout_buf.push_str(&l);
                            stdout_buf.push('\n');
                            let _ = on_event_clone.send(ProcessEvent::Stdout {
                                process_id: pid_clone.clone(),
                                chunk: format!("{}\n", l),
                            });
                        }
                        Ok(None) => {
                            stdout_done = true;
                        }
                        Err(e) => {
                            let _ = on_event_clone.send(ProcessEvent::Error {
                                process_id: pid_clone.clone(),
                                message: format!("stdout read error: {}", e),
                            });
                            break;
                        }
                    }
                }
                line = stderr_reader.next_line(), if !stderr_done => {
                    match line {
                        Ok(Some(l)) => {
                            stderr_buf.push_str(&l);
                            stderr_buf.push('\n');
                            let _ = on_event_clone.send(ProcessEvent::Stderr {
                                process_id: pid_clone.clone(),
                                chunk: format!("{}\n", l),
                            });
                        }
                        Ok(None) => {
                            stderr_done = true;
                        }
                        Err(e) => {
                            stderr_done = true;
                            let _ = on_event_clone.send(ProcessEvent::Error {
                                process_id: pid_clone.clone(),
                                message: format!("stderr read error: {}", e),
                            });
                        }
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
