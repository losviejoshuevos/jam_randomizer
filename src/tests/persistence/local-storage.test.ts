import { describe, expect, it } from "vitest";
import type { KeyValueStorage, PersistedJamState } from "@/lib/persistence/contracts";
import {
  createJamPersistence,
  JAM_STORAGE_KEY,
} from "@/lib/persistence/local-storage";

class MemoryStorage implements KeyValueStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const emptyState: PersistedJamState = {
  schemaVersion: 1,
  currentSession: null,
  recentSessions: [],
  latestSettings: null,
  selectedTheme: "dark",
};

describe("local Jam persistence", () => {
  it("round-trips state through storage", () => {
    const persistence = createJamPersistence(new MemoryStorage());

    expect(persistence.save(emptyState)).toEqual({ ok: true, value: undefined });
    expect(persistence.load()).toEqual({ ok: true, value: emptyState });
  });

  it("reports corrupt JSON without throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(JAM_STORAGE_KEY, "not-json");

    expect(createJamPersistence(storage).load()).toEqual({
      ok: false,
      error: "corrupt",
    });
  });
});
