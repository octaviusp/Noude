use crate::error::AppError;
use crate::process_manager::ProcessManager;
use crate::streaming::ProcessEvent;
use std::sync::Arc;
use tauri::ipc::Channel;
use tauri::State;
use tokio::io::AsyncBufReadExt;
use tokio::sync::watch;
use uuid::Uuid;

/// Kill entire process group (child + all descendants) on unix.
/// Falls back to child.kill() on non-unix or if killpg fails.
#[cfg(unix)]
async fn kill_process_tree(child: &mut tokio::process::Child) {
    if let Some(pid) = child.id() {
        // Send SIGTERM to the process group first
        unsafe { libc::killpg(pid as libc::pid_t, libc::SIGTERM); }
        // Give processes a moment to exit gracefully
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        // Force kill with SIGKILL
        unsafe { libc::killpg(pid as libc::pid_t, libc::SIGKILL); }
    }
    let _ = child.kill().await;
}

#[cfg(not(unix))]
async fn kill_process_tree(child: &mut tokio::process::Child) {
    let _ = child.kill().await;
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeInvokeArgs {
    pub prompt: String,
    pub model: Option<String>,
    pub output_format: Option<String>,
    pub allowed_tools: Option<Vec<String>>,
    pub disallowed_tools: Option<Vec<String>>,
    pub append_system_prompt: Option<String>,
    pub max_budget_usd: Option<f64>,
    pub permission_mode: Option<String>,
    pub working_directory: Option<String>,
    pub additional_dirs: Option<Vec<String>>,
    pub continue_session: Option<bool>,
    pub max_turns: Option<u32>,
    pub json_schema: Option<String>,
    pub timeout_ms: Option<u64>,
}

fn normalize_model_alias(model: &str) -> String {
    let trimmed = model.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let key = trimmed.to_lowercase().replace(' ', "-");
    match key.as_str() {
        "sonnet-latest" | "latest-sonnet" | "claude-sonnet-latest" => "sonnet".to_string(),
        "opus-latest" | "latest-opus" | "claude-opus-latest" => "opus".to_string(),
        "haiku-latest" | "latest-haiku" | "claude-haiku-latest" => "haiku".to_string(),
        _ => trimmed.to_string(),
    }
}

#[tauri::command]
pub async fn invoke_claude(
    args: ClaudeInvokeArgs,
    on_event: Channel<ProcessEvent>,
    process_manager: State<'_, Arc<ProcessManager>>,
) -> Result<String, AppError> {
    let process_id = Uuid::new_v4().to_string();

    let mut cmd_args: Vec<String> = vec!["-p".into(), args.prompt.clone()];

    if let Some(ref model) = args.model {
        let normalized = normalize_model_alias(model);
        if !normalized.is_empty() {
            cmd_args.extend(["--model".into(), normalized]);
        }
    }

    let format = match args.output_format.as_deref() {
        Some("json") => "json",
        Some("stream-json") => "stream-json",
        Some("text") => "text",
        _ => "stream-json",
    };
    cmd_args.extend(["--output-format".into(), format.into()]);

    // Claude CLI requires --verbose with --print when using stream-json output.
    if format == "stream-json" {
        cmd_args.push("--verbose".into());
    }

    if let Some(ref tools) = args.allowed_tools {
        if !tools.is_empty() {
            cmd_args.extend(["--allowedTools".into(), tools.join(",")]);
        }
    }

    if let Some(ref tools) = args.disallowed_tools {
        if !tools.is_empty() {
            cmd_args.extend(["--disallowedTools".into(), tools.join(",")]);
        }
    }

    if let Some(ref prompt) = args.append_system_prompt {
        if !prompt.is_empty() {
            cmd_args.extend(["--append-system-prompt".into(), prompt.clone()]);
        }
    }

    if let Some(budget) = args.max_budget_usd {
        if budget > 0.0 {
            cmd_args.extend(["--max-budget-usd".into(), budget.to_string()]);
        }
    }

    if let Some(ref mode) = args.permission_mode {
        match mode.as_str() {
            "bypassPermissions" => cmd_args.push("--dangerously-skip-permissions".into()),
            "acceptEdits" | "dontAsk" | "plan" | "delegate" => {
                cmd_args.extend(["--permission-mode".into(), mode.clone()]);
            }
            _ => {}
        }
    }

    if let Some(ref dirs) = args.additional_dirs {
        for dir in dirs {
            cmd_args.extend(["--add-dir".into(), dir.clone()]);
        }
    }

    if args.continue_session.unwrap_or(false) {
        cmd_args.push("--continue".into());
    }

    if let Some(turns) = args.max_turns {
        if turns > 0 {
            cmd_args.extend(["--max-turns".into(), turns.to_string()]);
        }
    }

    if let Some(ref schema) = args.json_schema {
        if !schema.is_empty() {
            cmd_args.extend(["--json-schema".into(), schema.clone()]);
        }
    }

    let working_dir = args
        .working_directory
        .clone()
        .unwrap_or_else(|| std::env::current_dir().unwrap().to_string_lossy().to_string());

    let mut cmd = tokio::process::Command::new("claude");
    cmd.args(&cmd_args)
        .current_dir(&working_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    // Create a new process group so we can kill the entire tree
    #[cfg(unix)]
    cmd.process_group(0);

    let mut child = cmd
        .spawn()
        .map_err(|e| AppError::Process(format!("Failed to spawn claude: {}", e)))?;

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
                        kill_process_tree(&mut child).await;
                        let _ = on_event_clone.send(ProcessEvent::Cancelled {
                            process_id: pid_clone.clone(),
                        });
                        pm.remove(&pid_clone);
                        return;
                    }
                }
                timed_out = &mut timeout_fut => {
                    if timed_out {
                        kill_process_tree(&mut child).await;
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
