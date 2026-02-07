export interface ThemeTokens {
  accent: string;
  accentHover: string;
  accentMuted: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
}

export type MotionLevel = 'balanced' | 'high' | 'minimal';

export interface SidebarState {
  mobileOpen: boolean;
  collapsed: boolean;
}

export type ViewMode = 'canvas' | 'table';
