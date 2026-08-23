import type {
  GenerationSettings,
  JamSession,
  SectionHarmonySettings,
  SectionLabel,
  ThemeId,
} from "../music/domain/types";

export const CURRENT_SCHEMA_VERSION = 3;
export const MAX_RECENT_SESSIONS = 30;

export interface PersistedJamState {
  schemaVersion: number;
  currentSession: JamSession | null;
  recentSessions: JamSession[];
  favoriteSessions: JamSession[];
  latestSettings: GenerationSettings | null;
  appliedTimingSettings?: GenerationSettings | null;
  latestSectionSettings?: Partial<Record<SectionLabel, SectionHarmonySettings>> | null;
  selectedTheme: ThemeId;
}

export type PersistenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: "unavailable" | "corrupt" | "incompatible" };

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface JamPersistence {
  load(): PersistenceResult<PersistedJamState | null>;
  save(state: PersistedJamState): PersistenceResult<void>;
  clear(): PersistenceResult<void>;
}
