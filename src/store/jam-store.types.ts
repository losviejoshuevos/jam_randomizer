import type {
  GenerationSettings,
  JamSession,
  SectionId,
  ThemeId,
} from "../lib/music/domain/types";

export interface JamStoreState {
  currentSession: JamSession | null;
  recentSessions: JamSession[];
  favoriteSessions: JamSession[];
  latestSettings: GenerationSettings | null;
  selectedTheme: ThemeId;
}

export interface JamStoreActions {
  createSession(settings: GenerationSettings): void;
  regenerateSession(): void;
  regenerateSection(sectionId: SectionId): void;
  toggleSectionLock(sectionId: SectionId): void;
  restorePreviousSession(): void;
}

export type JamStore = JamStoreState & JamStoreActions;
