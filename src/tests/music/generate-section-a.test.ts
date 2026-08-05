import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Mode,
} from "@/lib/music/domain/types";
import { generateSectionA } from "@/lib/music/generator";
import { getAvailableChordDefinitions } from "@/lib/music/harmony/availability";
import { validateGeneratedSection } from "@/lib/music/validation/validate-section";

function settings(
  harmonicFreedom: HarmonicFreedom = "colorful",
  complexity: Complexity = "advanced",
  mode: Mode = "minor",
): GenerationSettings {
  return {
    styleId: "funk",
    key: "C",
    mode,
    bpm: "random",
    meter: "4/4",
    complexity,
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
    const neighboringRoman = new Set(
      getAvailableChordDefinitions(funkStyleProfile, adventurousSettings)
        .filter(({ tonalSource }) => tonalSource.kind === "neighboring-key")
        .map(({ roman }) => roman),
    );

    for (let seed = 0; seed < 300; seed += 1) {
      const result = generateSectionA({
        seed: `adventurous-${seed}`,
        settings: adventurousSettings,
        styleProfile: funkStyleProfile,
      });
      result.value.chords.forEach(({ roman }) => generatedRoman.add(roman));
    }

    expect(
      [...generatedRoman].some(
        (roman) => roman !== null && neighboringRoman.has(roman),
      ),
    ).toBe(true);
  });

  it("generates song-derived Funk pattern families", () => {
    const generatedPatterns = new Set<string>();
    const patternSettings = [
      settings("adventurous", "medium", "major"),
      settings("colorful", "medium", "minor"),
      settings("adventurous", "advanced", "major"),
    ];

    for (const generationSettings of patternSettings) {
      for (let seed = 0; seed < 1_000; seed += 1) {
        const result = generateSectionA({
          seed: `research-pattern-${generationSettings.mode}-${generationSettings.complexity}-${seed}`,
          settings: generationSettings,
          styleProfile: funkStyleProfile,
        });

        generatedPatterns.add(
          result.value.chords.map(({ roman }) => roman).join(" "),
        );
      }
    }

    expect(generatedPatterns).toContain("I9 II9 bII9 I9");
    expect(generatedPatterns).toContain("i7 IV9 i7 IV9");
    expect(generatedPatterns).toContain("I13 I13sus4 I13 I13sus4");
  });

  it("uses triads only on easy cards", () => {
    for (const mode of ["major", "minor"] as const) {
      const easySettings = settings("adventurous", "easy", mode);

      for (let seed = 0; seed < 300; seed += 1) {
        const result = generateSectionA({
          seed: `easy-${mode}-${seed}`,
          settings: easySettings,
          styleProfile: funkStyleProfile,
        });

        expect(
          result.value.chords.every(({ roman }) =>
            /^(?:b|#)?[ivIV]+$/.test(roman ?? ""),
          ),
          `seed easy-${mode}-${seed}`,
        ).toBe(true);
      }
    }
  });

  it("does not start medium or advanced major cards with a plain triad", () => {
    for (const complexity of ["medium", "advanced"] as const) {
      const generationSettings = settings("adventurous", complexity, "major");

      for (let seed = 0; seed < 300; seed += 1) {
        const result = generateSectionA({
          seed: `first-chord-${complexity}-${seed}`,
          settings: generationSettings,
          styleProfile: funkStyleProfile,
        });

        expect(result.value.chords[0]?.roman).not.toBe("I");
        expect(result.value.chords[0]?.renderedSymbol).not.toBe("C");
      }
    }
  });

  it("keeps advanced vocabulary while allowing familiar minor 7 and 9 colors", () => {
    for (const mode of ["major", "minor"] as const) {
      const advancedSettings = settings("adventurous", "advanced", mode);

      for (let seed = 0; seed < 300; seed += 1) {
        const result = generateSectionA({
          seed: `advanced-extensions-${mode}-${seed}`,
          settings: advancedSettings,
          styleProfile: funkStyleProfile,
        });

        expect(
          result.value.chords.every(({ roman }) =>
            /(?:maj9|11|13|7#9|7b9)/.test(roman ?? "") ||
              (mode === "minor" && /(?:i7|i9)/.test(roman ?? "")),
          ),
          `seed advanced-extensions-${mode}-${seed}`,
        ).toBe(true);
      }
    }
  });

  it("varies the first minor tonic between 7, 9, and 11 on advanced", () => {
    const firstTonics = new Set<string>();
    const advancedSettings = settings("adventurous", "advanced", "minor");

    for (let seed = 0; seed < 600; seed += 1) {
      const result = generateSectionA({
        seed: `advanced-minor-tonic-${seed}`,
        settings: advancedSettings,
        styleProfile: funkStyleProfile,
      });
      const firstRoman = result.value.chords[0]?.roman;
      if (firstRoman === "i7" || firstRoman === "i9" || firstRoman === "i11") {
        firstTonics.add(firstRoman);
      }
    }

    expect(firstTonics).toEqual(new Set(["i7", "i9", "i11"]));
  });

  it("produces Funk vamps, limited-function loops, and open endings", () => {
    const generationSettings = settings("adventurous", "medium", "major");
    let foundOneChordVamp = false;
    let foundTwoFunctionLoop = false;
    let foundOpenEnding = false;

    for (let seed = 0; seed < 500; seed += 1) {
      const result = generateSectionA({
        seed: `funk-shape-${seed}`,
        settings: generationSettings,
        styleProfile: funkStyleProfile,
      });
      const functions = new Set(
        result.value.chords.map(({ harmonicFunction }) => harmonicFunction),
      );
      const lastFunction = result.value.chords.at(-1)?.harmonicFunction;

      foundOneChordVamp ||= result.value.chords.length === 1;
      foundTwoFunctionLoop ||= functions.size <= 2;
      foundOpenEnding ||=
        lastFunction === "color" || lastFunction === "predominant";
    }

    expect(foundOneChordVamp).toBe(true);
    expect(foundTwoFunctionLoop).toBe(true);
    expect(foundOpenEnding).toBe(true);
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
