use dashmap::DashMap;
use tokio::sync::watch;

pub struct ProcessEntry {
    pub cancel_tx: watch::Sender<bool>,
}

pub struct ProcessManager {
    processes: DashMap<String, ProcessEntry>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: DashMap::new(),
        }
    }

    pub fn register(&self, id: String, cancel_tx: watch::Sender<bool>) {
        self.processes.insert(id, ProcessEntry { cancel_tx });
    }

    pub fn cancel(&self, id: &str) -> bool {
        if let Some(entry) = self.processes.get(id) {
            let _ = entry.cancel_tx.send(true);
            true
        } else {
            false
        }
    }

    pub fn cancel_all(&self) {
        for entry in self.processes.iter() {
            let _ = entry.cancel_tx.send(true);
        }
    }

    pub fn remove(&self, id: &str) {
        self.processes.remove(id);
    }
}
