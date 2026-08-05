import {
  CURRENT_SCHEMA_VERSION,
  type JamPersistence,
  type KeyValueStorage,
  type PersistedJamState,
  type PersistenceResult,
} from "./contracts";

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
