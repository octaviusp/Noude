# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Noude.ai

A visual AI agent orchestrator built with Tauri v2. Users create DAGs of Claude Code and Bash nodes on a React Flow canvas, connect them with edges, and execute the entire flow. Nodes run in parallel layers, outputs flow downstream, and execution is streamed live from the Rust backend.

## Build & Dev Commands

```bash
npx tauri dev              # Full dev mode (Vite + Rust backend)
npx tauri build            # Production build (creates DMG)
npx tsc --noEmit           # TypeScript type checking
npx vite build             # Frontend-only build
cargo check --manifest-path src-tauri/Cargo.toml  # Rust type checking
```

No test suite exists yet.

## Architecture

**Stack:** Tauri 2 (Rust) · React 19 · Zustand 5 · React Flow 12 · ELK.js · Tailwind 4

### Frontend → Backend Flow

1. Frontend calls Tauri commands via `src/lib/tauri.ts` (`invokeClaude`, `invokeBash`)
2. Rust spawns `tokio::process::Command` (claude CLI or bash shell)
3. Stdout/stderr stream back via **Tauri Channel** (`ProcessEvent` enum)
4. Frontend `onEvent` callback updates Zustand execution store in real-time
5. On completion, final output is parsed and stored in `nodeOutputs` Map

### Execution Engine

Lives in `src/store/executionStore.ts` (not a standalone module). The `runFlow()` function:

1. **Tarjan SCC** (`src/engine/dag.ts`) — detects cycles in the graph
2. **Kahn topological sort** — groups nodes into parallel execution layers
3. **Layer execution** — nodes in same layer run concurrently (capped by `Semaphore` in `src/engine/scheduler.ts`, default concurrency: 3)
4. **Cycle groups** — iterative execution with convergence detection (`src/engine/cycleHandler.ts`)
5. **Input merging** (`src/engine/inputMerger.ts`) — collects upstream outputs, sorted by edge priority, builds `MergedInput`

### State Management (Zustand)

**`src/store/flowStore.ts`** — PERSISTED (localStorage). Canvas state: nodes, edges, viewport, flow metadata, defaults.

**`src/store/executionStore.ts`** — EPHEMERAL. Runtime state: `flowStatus`, `nodeStatuses`, `nodeOutputs`, `nodeStreaming`, `activeProcessIds`, `subAgents`, `nodeToolActivity`, `nodeLiveMetrics`.

### Node Type Convention

All React Flow nodes have `type: 'noude'` — the actual node type is in `data.nodeType` (`'claude-code'` | `'bash'`). `BaseNode` dispatches rendering to `ClaudeCodeNode` or `BashNode`. Same pattern for edges: all use `type: 'noude'` (custom `AnimatedEdge`).

### Rust Backend

- `src-tauri/src/commands/claude.rs` — spawns `claude` CLI with streaming
- `src-tauri/src/commands/bash.rs` — spawns shell with env vars
- `src-tauri/src/commands/process.rs` — cancel via `tokio::sync::watch` channel
- `src-tauri/src/process_manager.rs` — `DashMap<String, ProcessEntry>` for concurrent process tracking
- `src-tauri/src/streaming.rs` — `ProcessEvent` enum (Started, Stdout, Stderr, Completed, Error, Cancelled)

### Stream-JSON Live Tracking

When `outputFormat: 'stream-json'`, `parseStreamLine()` in executionStore parses each JSON line from Claude CLI:
- `assistant` messages → increment turn count, detect `tool_use` blocks
- `Task` tool uses → spawn sub-agent mini-nodes on canvas via `flowStore.addSubAgentNode()`
- `tool_result` → mark tool activity as completed
- Sub-agent nodes are cleaned up when parent node completes

### Prompt Building (`src/lib/prompt.ts`)

- `{{input}}` placeholder in prompts gets replaced with upstream `combinedText`
- Without placeholder, upstream context is prepended as a section
- Bash nodes get `NOUDE_INPUT` and `NOUDE_DATA` env vars

## Key Types (`src/types/`)

- `ClaudeCodeNodeData` — prompt, model, outputFormat, permissionMode, maxTurns, maxBudgetUsd, allowedTools
- `BashNodeData` — script, shell, env
- `NodeOutput` — result text/data, meta (cost, turns, tokens, duration, model), error
- `MergedInput` — sources array, combinedText, combinedData, hasErrors
- `ExecutionPlan` — layers (string[][]), cycleGroups, isAcyclic
- `SubAgent` / `ToolActivity` / `LiveMetrics` — live execution tracking

## Gotchas

- **Zustand selector infinite loop**: NEVER use `?? []` or `: []` as fallbacks in Zustand selectors — creates new array references each render, triggering `useSyncExternalStore` infinite re-render. Fix: use a module-level `const EMPTY: T[] = []` constant.
- **Bundle identifier** must NOT end with `.app` (conflicts with macOS bundle extension)
- **Node type confusion**: React Flow `node.type` is always `'noude'`; actual type is `node.data.nodeType`
- **Cargo check**: must run from `src-tauri/` or use `--manifest-path`
- **Permission mode**: `'bypassPermissions'` maps to `--dangerously-skip-permissions` in the CLI
- **Claude CLI args**: use camelCase flags like `--allowedTools`, `--disallowedTools`

## Branch Strategy

```
main       ← production (protected, PR-only)
  develop  ← integration (protected, PR-only)
    feat/* ← feature branches from develop
```

Current active branch: `feat/noude-mvp`

## Commit Format

```
git commit -m "[TYPE] short-description"
```

Types: `FEAT` | `FIX` | `DOC` | `REFACTOR` | `TEST` | `CHORE` | `CI`
