# Agent Guide (Synced: `CLAUDE.md` / `AGENTS.md`)

This repository uses the same guidance in `CLAUDE.md` and `AGENTS.md`.
If you update one, update the other in the same commit.

## What Noude Is

Noude is a visual AI agent orchestrator built with Tauri v2.
Users create DAGs of Claude Code and Bash nodes on a React Flow canvas,
connect them with edges, and execute flows with live streamed output.

## Current Stack

- Tauri 2 (Rust backend)
- React 19 + TypeScript
- Zustand 5
- React Flow 12 (`@xyflow/react`)
- ELK.js (auto-layout)
- Tailwind 4 (imported), plus a custom tokenized CSS system in `src/index.css`

## Dev Commands

```bash
# Frontend only
npm run dev
npm run build

# Type checks
npx tsc --noEmit
cargo check --manifest-path src-tauri/Cargo.toml

# Full app (Vite + Tauri)
npx tauri dev
npx tauri build
```

Notes:
- There is currently no dedicated test suite.
- `npm run build` may emit a chunk-size warning from Vite; build still succeeds.

## Frontend Architecture (Post UI Refactor)

### App Shell Layout

`src/App.tsx` now uses a sidebar-first shell:

1. `AppShell` (`src/layout/AppShell.tsx`)
   - Renders sidebar + main region
   - Handles mobile scrim overlay
2. `Sidebar` (`src/layout/Sidebar.tsx`)
   - Replaces legacy top toolbar
   - Handles add-node actions, run/stop, save/load, workspace picker, flow name
3. `MainWorkspace` (`src/layout/MainWorkspace.tsx`)
   - Header (flow title, status)
   - Workspace content wrapper
4. Center content
   - React Flow canvas (`ReactFlow`, `Background`, `Controls`, `MiniMap`)
   - Right drawer: `NodeConfigPanel`
   - Bottom console: `OutputPanel`

### Legacy UI Removed

The following were removed as dead/legacy code:
- `src/toolbar/Toolbar.tsx`
- `src/components/ui/separator.tsx`
- `createNodeComponent` helper from `src/nodes/BaseNode.tsx`

Do not re-introduce toolbar-based shell patterns unless explicitly requested.

### Design System

Primary source: `src/index.css`

- Tokenized dark theme (background hierarchy, borders, text tiers, accents)
- Shared interaction states (hover/focus/active)
- Motion keyframes (`pulse`, `slideInRight`, `scaleIn`)
- Accessibility rules:
  - `prefers-reduced-motion`
  - `prefers-contrast: high`
- Responsive shell behavior:
  - desktop sidebar
  - tablet compaction
  - mobile off-canvas sidebar + scrim

### Shared UI Primitives

Located in `src/components/ui/`:
- `button.tsx`
- `input.tsx`
- `select.tsx`
- `textarea.tsx`
- `badge.tsx`
- `switch.tsx`

These map to global class-based styles (`.ui-*`) in `src/index.css`.
Prefer extending these components rather than adding inline style mutations.

## State Management (Zustand)

### `src/store/flowStore.ts`

In-memory flow graph state (not persisted automatically):
- nodes, edges, viewport
- flow name/id/defaults
- selection state
- node/edge CRUD
- import/export helpers
- auto-layout
- sub-agent node lifecycle helpers

### `src/store/executionStore.ts`

Ephemeral runtime state:
- `flowStatus`, per-node status/output/streaming
- active process IDs
- logs
- live tool/sub-agent metrics
- `runFlow`, `cancelFlow`, `cancelNode`, `resetExecution`

### `src/store/uiStore.ts`

UI shell state:
- `sidebarCollapsed`
- `sidebarMobileOpen`
- `outputCollapsed`
- `outputHeight`

This store should hold visual/layout UI state rather than mixing it into flow or execution stores.

## Execution Engine

Execution planning and orchestration happen in `src/store/executionStore.ts` with helpers:

1. Tarjan SCC + topological layering: `src/engine/dag.ts`
2. Concurrency control: `src/engine/scheduler.ts` (`Semaphore`)
3. Cycle handling/convergence: `src/engine/cycleHandler.ts`
4. Upstream input merging: `src/engine/inputMerger.ts`

Execution behavior:
- nodes execute by layer
- layer execution respects `maxConcurrency`
- cycle groups iterate until convergence or iteration limit
- optional stop-on-error behavior from flow defaults

## Node + Edge Conventions

- Main flow nodes: React Flow `type: 'noude'`
- Actual node kind: `node.data.nodeType` (`'claude-code' | 'bash'`)
- Sub-agent visual nodes: `type: 'sub-agent'`
- Custom edge renderer: `type: 'noude'` via `src/edges/AnimatedEdge.tsx`

Important: `node.type` is not the business node type for normal nodes.

## Prompt + Runtime Data Flow

Prompt/script building:
- `src/lib/prompt.ts`
  - `{{input}}` injects upstream merged text
  - without placeholder, upstream context is prepended
- Bash nodes also receive `NOUDE_INPUT` and `NOUDE_DATA` env vars

Tauri bridge:
- `src/lib/tauri.ts`
  - `invokeClaude`, `invokeBash`
  - `cancelProcess`, `cancelAllProcesses`
  - `pickFolder`

## Rust Backend Map

- `src-tauri/src/commands/claude.rs` — Claude CLI process + streaming
- `src-tauri/src/commands/bash.rs` — shell command execution
- `src-tauri/src/commands/process.rs` — process cancellation commands
- `src-tauri/src/process_manager.rs` — concurrent process tracking
- `src-tauri/src/streaming.rs` — `ProcessEvent` stream model

## Stream-JSON Live Tracking

When Claude nodes use `outputFormat: 'stream-json'`, stream lines are parsed to:
- track assistant turns
- track tool use lifecycle
- spawn sub-agent visual nodes for Task-tool activity
- complete/cleanup tool and sub-agent state on completion

## Key Types

Core type definitions live in `src/types/`:
- `nodes.ts`: `ClaudeCodeNodeData`, `BashNodeData`, `AnyNodeData`
- `execution.ts`: `NodeStatus`, `NodeOutput`, execution metadata
- `flow.ts`: flow definition/serialization model
- `edges.ts`: edge data (`NoudeEdgeData`)
- `protocol.ts`: frontend/backend protocol-facing types
- `ui.ts`: UI-oriented types (`ThemeTokens`, `MotionLevel`, `SidebarState`, `ViewMode`)

## Serialization

- `src/lib/serialization.ts`
  - `exportFlow`
  - `importFlow`
  - `downloadFlow`
  - `loadFlowFromFile`

Flows are user-exported/imported JSON; there is no automatic persisted localStorage flow snapshot in current code.

## Gotchas

- Zustand selector loops:
  - avoid `?? []` / inline empty arrays in selectors
  - use module-level `const EMPTY = []`
- Node type confusion:
  - `node.type` is `'noude'`, actual logical type is `node.data.nodeType`
- Cargo check path:
  - run from `src-tauri/` or use `--manifest-path`
- Claude CLI args:
  - use camelCase flags (e.g., `--allowedTools`, `--disallowedTools`)
- Permission mapping:
  - `bypassPermissions` maps to CLI dangerous skip mode
- UI architecture:
  - sidebar is the source of primary actions; toolbar code is legacy and removed

## Git / Branching Conventions

```text
main       <- production (protected, PR-only)
  develop  <- integration (protected, PR-only)
    feat/* <- feature branches from develop
    fix/*  <- fix branches from develop
```

Current working branch in this repo has been `feat/noude-mvp`.

Commit format:

```bash
git commit -m "[TYPE] short-description"
```

Types: `FEAT` | `FIX` | `DOC` | `REFACTOR` | `TEST` | `CHORE` | `CI`
