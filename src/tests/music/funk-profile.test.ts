import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type { Complexity, GenerationSettings, Mode } from "@/lib/music/domain/types";
import { getAvailableChordDefinitions } from "@/lib/music/harmony/availability";

describe("Funk style profile", () => {
  it("is JSON serializable and supports the MVP meters", () => {
    const serialized = JSON.stringify(funkStyleProfile);
    const parsed = JSON.parse(serialized) as typeof funkStyleProfile;

    expect(parsed.id).toBe("funk");
    expect(parsed.allowedMeters.map(({ value }) => value)).toEqual(["4/4", "3/4"]);
    expect(serialized).not.toContain("undefined");
  });

  it("keeps tonal freedom levels progressively broader", () => {
    expect(funkStyleProfile.tonalSourceWeights.strict.neighboringKey).toBe(0);
    expect(funkStyleProfile.tonalSourceWeights.colorful.parallelMode).toBeGreaterThan(0);
    expect(funkStyleProfile.tonalSourceWeights.adventurous.neighboringKey).toBeGreaterThan(0);
  });

  it("expands the manual chord vocabulary at every complexity", () => {
    for (const complexity of ["easy", "medium", "advanced"] as Complexity[]) {
      for (const mode of ["major", "minor"] as Mode[]) {
        const base = {
          styleId: "funk",
          key: "C",
          mode,
          bpm: 100,
          meter: "4/4",
          complexity,
          timing: {
            sectionADurationSeconds: 150,
            sectionBDurationSeconds: 90,
            transitionWarningSeconds: 10,
          },
        } satisfies Omit<GenerationSettings, "harmonicFreedom">;
        const strict = getAvailableChordDefinitions(funkStyleProfile, {
          ...base,
          harmonicFreedom: "strict",
        });
        const adventurous = getAvailableChordDefinitions(funkStyleProfile, {
          ...base,
          harmonicFreedom: "adventurous",
        });

        expect(adventurous.length).toBeGreaterThan(strict.length);
      }
    }
  });
});
