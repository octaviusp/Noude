import { create } from 'zustand';

export type OutputAutoOpenMode = 'on-run' | 'on-error' | 'manual';

export interface NodeContextMenuState {
  nodeId: string;
  x: number;
  y: number;
}

export interface QuickSettingsState {
  nodeId: string;
  x: number;
  y: number;
}

interface UiState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  outputCollapsed: boolean;
  outputHeight: number;
  outputPinned: boolean;
  outputAutoOpenMode: OutputAutoOpenMode;
  actionPaletteOpen: boolean;
  nodeSettingsSheetNodeId: string | null;
  nodeContextMenu: NodeContextMenuState | null;
  quickSettings: QuickSettingsState | null;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setOutputCollapsed: (collapsed: boolean) => void;
  setOutputHeight: (height: number) => void;
  setOutputPinned: (pinned: boolean) => void;
  setOutputAutoOpenMode: (mode: OutputAutoOpenMode) => void;
  setActionPaletteOpen: (open: boolean) => void;
  setNodeSettingsSheetNodeId: (nodeId: string | null) => void;
  setNodeContextMenu: (menu: NodeContextMenuState | null) => void;
  setQuickSettings: (settings: QuickSettingsState | null) => void;
  clearTransientOverlays: () => void;
}

const DEFAULT_OUTPUT_HEIGHT = 190;

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: true,
  sidebarMobileOpen: false,
  outputCollapsed: true,
  outputHeight: DEFAULT_OUTPUT_HEIGHT,
  outputPinned: false,
  outputAutoOpenMode: 'on-run',
  actionPaletteOpen: false,
  nodeSettingsSheetNodeId: null,
  nodeContextMenu: null,
  quickSettings: null,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  setOutputCollapsed: (collapsed) => set({ outputCollapsed: collapsed }),
  setOutputHeight: (height) => set({ outputHeight: height }),
  setOutputPinned: (pinned) => set({ outputPinned: pinned }),
  setOutputAutoOpenMode: (mode) => set({ outputAutoOpenMode: mode }),
  setActionPaletteOpen: (open) => set({ actionPaletteOpen: open }),
  setNodeSettingsSheetNodeId: (nodeId) => set({ nodeSettingsSheetNodeId: nodeId }),
  setNodeContextMenu: (menu) => set({ nodeContextMenu: menu }),
  setQuickSettings: (settings) => set({ quickSettings: settings }),
  clearTransientOverlays: () =>
    set({
      actionPaletteOpen: false,
      nodeContextMenu: null,
      quickSettings: null,
    }),
}));
