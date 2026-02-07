import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  sidebarMobileOpen: boolean;
  outputCollapsed: boolean;
  outputHeight: number;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setSidebarMobileOpen: (open: boolean) => void;
  setOutputCollapsed: (collapsed: boolean) => void;
  setOutputHeight: (height: number) => void;
}

const DEFAULT_OUTPUT_HEIGHT = 190;

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  outputCollapsed: false,
  outputHeight: DEFAULT_OUTPUT_HEIGHT,

  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleSidebarCollapsed: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarMobileOpen: (open) => set({ sidebarMobileOpen: open }),
  setOutputCollapsed: (collapsed) => set({ outputCollapsed: collapsed }),
  setOutputHeight: (height) => set({ outputHeight: height }),
}));
