import {
  CURRENT_SCHEMA_VERSION,
  type JamPersistence,
  type KeyValueStorage,
  type PersistedJamState,
  type PersistenceResult,
} from "./contracts";
import type { JamSession } from "../music/domain/types";

export const JAM_STORAGE_KEY = "jam-randomizer:state";

function isPersistedState(value: unknown): value is PersistedJamState {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<PersistedJamState>;

  return (
    typeof candidate.schemaVersion === "number" &&
    Array.isArray(candidate.recentSessions) &&
    typeof candidate.selectedTheme === "string"
  );
}

function migrateSession(session: JamSession): JamSession {
  return {
    ...session,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sections: session.sections.map((section) => ({
      ...section,
      harmonySettings: section.harmonySettings ?? {
        key: session.key,
        mode: session.mode,
        complexity: session.complexity,
        harmonicFreedom: session.harmonicFreedom,
      },
    })),
  };
}

function migrateVersionOne(state: PersistedJamState): PersistedJamState {
  const currentSession = state.currentSession
    ? migrateSession(state.currentSession)
    : null;
  return {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentSession,
    recentSessions: state.recentSessions.map(migrateSession),
    latestSectionSettings: currentSession
      ? {
          A:
            currentSession.sections.find(({ label }) => label === "A")
              ?.harmonySettings ?? {
              key: currentSession.key,
              mode: currentSession.mode,
              complexity: currentSession.complexity,
              harmonicFreedom: currentSession.harmonicFreedom,
            },
          B:
            currentSession.sections.find(({ label }) => label === "B")
              ?.harmonySettings ?? {
              key: currentSession.key,
              mode: currentSession.mode,
              complexity: currentSession.complexity,
              harmonicFreedom: currentSession.harmonicFreedom,
            },
        }
      : null,
    appliedTimingSettings: state.latestSettings,
  };
}

export function createJamPersistence(storage: KeyValueStorage): JamPersistence {
  return {
    load(): PersistenceResult<PersistedJamState | null> {
      try {
        const serialized = storage.getItem(JAM_STORAGE_KEY);

        if (serialized === null) {
          return { ok: true, value: null };
        }

        const parsed: unknown = JSON.parse(serialized);

        if (!isPersistedState(parsed)) {
          return { ok: false, error: "corrupt" };
        }

        if (parsed.schemaVersion === 1) {
          return { ok: true, value: migrateVersionOne(parsed) };
        }

        if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) {
          return { ok: false, error: "incompatible" };
        }

        return { ok: true, value: parsed };
      } catch (error) {
        return {
          ok: false,
          error: error instanceof SyntaxError ? "corrupt" : "unavailable",
        };
      }
    },

    save(state): PersistenceResult<void> {
      try {
        storage.setItem(JAM_STORAGE_KEY, JSON.stringify(state));
        return { ok: true, value: undefined };
      } catch {
        return { ok: false, error: "unavailable" };
      }
    },

    clear(): PersistenceResult<void> {
      try {
        storage.removeItem(JAM_STORAGE_KEY);
        return { ok: true, value: undefined };
      } catch {
        return { ok: false, error: "unavailable" };
      }
    },
  };
}
