import type {
  GenerationSettings,
  JamSession,
  ThemeId,
} from "../music/domain/types";

export const CURRENT_SCHEMA_VERSION = 1;
export const MAX_RECENT_SESSIONS = 10;

export interface PersistedJamState {
  schemaVersion: number;
  currentSession: JamSession | null;
  recentSessions: JamSession[];
  latestSettings: GenerationSettings | null;
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
