# Noude

Visual AI agent orchestrator. Build DAGs of Claude Code and Bash nodes, connect them, and execute flows with live streamed output.

## Features

- Visual node canvas (React Flow)
- Claude Code nodes with streaming output
- Bash script nodes
- DAG execution with topological ordering
- Live output panel with filtering
- Auto-layout with ELK.js
- Save/load flow files

## Requirements

- Node.js 18+
- Rust (for Tauri)
- Claude CLI installed and authenticated

## Development

```bash
npm install
npx tauri dev
```

## Build

```bash
npx tauri build
```

## License

MIT
