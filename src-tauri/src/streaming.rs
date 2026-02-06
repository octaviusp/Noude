use serde::Serialize;

#[derive(Clone, Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ProcessEvent {
    Started {
        process_id: String,
        pid: u32,
    },
    Stdout {
        process_id: String,
        chunk: String,
    },
    Stderr {
        process_id: String,
        chunk: String,
    },
    Completed {
        process_id: String,
        exit_code: Option<i32>,
        stdout_full: String,
        stderr_full: String,
    },
    Error {
        process_id: String,
        message: String,
    },
    Cancelled {
        process_id: String,
    },
}
