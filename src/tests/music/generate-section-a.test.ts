import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type {
  GenerationSettings,
  HarmonicFreedom,
} from "@/lib/music/domain/types";
import { generateSectionA } from "@/lib/music/generator";
import { getAvailableChordDefinitions } from "@/lib/music/harmony/availability";
import { validateGeneratedSection } from "@/lib/music/validation/validate-section";

function settings(
  harmonicFreedom: HarmonicFreedom = "colorful",
): GenerationSettings {
  return {
    styleId: "funk",
    key: "C",
    mode: "minor",
    bpm: "random",
    meter: "4/4",
    complexity: "advanced",
    harmonicFreedom,
    timing: {
      sectionADurationSeconds: 150,
      sectionBDurationSeconds: 90,
      transitionWarningSeconds: 10,
    },
  };
}

describe("generateSectionA", () => {
  it("is exactly reproducible for the same seed and settings", () => {
    const request = {
      seed: "reproducible-a",
      settings: settings(),
      styleProfile: funkStyleProfile,
    };

    expect(generateSectionA(request)).toEqual(generateSectionA(request));
  });

  it("respects strict harmonic freedom", () => {
    const strictSettings = settings("strict");
    const allowedRoman = new Set(
      getAvailableChordDefinitions(funkStyleProfile, strictSettings).map(
        ({ roman }) => roman,
      ),
    );

    for (let seed = 0; seed < 200; seed += 1) {
      const result = generateSectionA({
        seed: `strict-${seed}`,
        settings: strictSettings,
        styleProfile: funkStyleProfile,
      });

      expect(result.value.chords.every(({ roman }) => allowedRoman.has(roman ?? ""))).toBe(
        true,
      );
    }
  });

  it("can use neighboring-key color in adventurous mode", () => {
    const adventurousSettings = settings("adventurous");
    const generatedRoman = new Set<string | null>();

    for (let seed = 0; seed < 300; seed += 1) {
      const result = generateSectionA({
        seed: `adventurous-${seed}`,
        settings: adventurousSettings,
        styleProfile: funkStyleProfile,
      });
      result.value.chords.forEach(({ roman }) => generatedRoman.add(roman));
    }

    expect(generatedRoman).toContain("V7/V");
  });

  it("keeps structural invariants across 1000 seeds", () => {
    const generationSettings = settings("adventurous");

    for (let seed = 0; seed < 1_000; seed += 1) {
      const result = generateSectionA({
        seed: `invariant-${seed}`,
        settings: generationSettings,
        styleProfile: funkStyleProfile,
      });
      const validation = validateGeneratedSection(
        result.value,
        "A",
        funkStyleProfile,
        generationSettings,
      );

      expect(validation, `seed invariant-${seed}`).toEqual({
        valid: true,
        issues: [],
      });
      expect(result.value.chords[0]?.harmonicFunction).toBe("tonic");
      expect(result.usedFallback).toBe(false);
    }
  });
});
