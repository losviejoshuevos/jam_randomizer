import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  type KeyValueStorage,
  type PersistedJamState,
} from "@/lib/persistence/contracts";
import {
  createJamPersistence,
  JAM_STORAGE_KEY,
} from "@/lib/persistence/local-storage";
import { funkStyleProfile } from "@/data/styles";
import { generateSession } from "@/lib/music/generator";

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
  schemaVersion: CURRENT_SCHEMA_VERSION,
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

  it("migrates version-one sessions to independent section settings", () => {
    const storage = new MemoryStorage();
    const session = generateSession({
      seed: "legacy-session",
      settings: {
        styleId: "funk",
        key: "Eb",
        mode: "minor",
        bpm: 96,
        meter: "4/4",
        complexity: "medium",
        harmonicFreedom: "colorful",
        timing: {
          sectionADurationSeconds: 150,
          sectionBDurationSeconds: 90,
          transitionWarningSeconds: 10,
        },
      },
      styleProfile: funkStyleProfile,
    }).value;
    const legacySession = {
      ...session,
      schemaVersion: 1,
      sections: session.sections.map((section) => ({
        ...section,
        harmonySettings: undefined,
      })),
    };
    storage.setItem(
      JAM_STORAGE_KEY,
      JSON.stringify({
        ...emptyState,
        schemaVersion: 1,
        currentSession: legacySession,
        recentSessions: [legacySession],
      }),
    );

    const loaded = createJamPersistence(storage).load();

    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.value?.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(
      loaded.value?.currentSession?.sections.every(
        ({ harmonySettings }) =>
          harmonySettings.key === "Eb" && harmonySettings.mode === "minor",
      ),
    ).toBe(true);
  });
});
