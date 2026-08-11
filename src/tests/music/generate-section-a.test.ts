import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Mode,
} from "@/lib/music/domain/types";
import { generateSectionA, generateSectionB } from "@/lib/music/generator";
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

  it("can use chromatic color in adventurous mode", () => {
    const adventurousSettings = settings("adventurous");
    const generatedRoman = new Set<string | null>();
    const chromaticRoman = new Set(
      getAvailableChordDefinitions(funkStyleProfile, adventurousSettings)
        .filter(({ harmonicPool }) => harmonicPool.startsWith("chromatic-"))
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
        (roman) => roman !== null && chromaticRoman.has(roman),
      ),
    ).toBe(true);
  });

  it("expands manual vocabulary with harmonic freedom", () => {
    const availableRoman = (harmonicFreedom: HarmonicFreedom) =>
      new Set(
        getAvailableChordDefinitions(
          funkStyleProfile,
          settings(harmonicFreedom, "advanced", "minor"),
        ).map(({ roman }) => roman),
      );
    const strictRoman = availableRoman("strict");
    const colorfulRoman = availableRoman("colorful");
    const adventurousRoman = availableRoman("adventurous");

    expect(colorfulRoman.size).toBeGreaterThan(strictRoman.size);
    expect(adventurousRoman.size).toBeGreaterThan(colorfulRoman.size);
    expect(strictRoman.has("i13")).toBe(true);
    expect(strictRoman.has("IV13")).toBe(false);
    expect(colorfulRoman.has("IV13")).toBe(true);
    expect(colorfulRoman.has("I13")).toBe(false);
    expect(adventurousRoman.has("I13")).toBe(true);
  });

  it("keeps the core tonic 13sus4 available by advanced complexity", () => {
    const strictAdvancedMajor = getAvailableChordDefinitions(
      funkStyleProfile,
      settings("strict", "advanced", "major"),
    ).map(({ roman }) => roman);
    const strictMediumMajor = getAvailableChordDefinitions(
      funkStyleProfile,
      settings("strict", "medium", "major"),
    ).map(({ roman }) => roman);

    expect(strictAdvancedMajor).toContain("I13sus4");
    expect(strictMediumMajor).not.toContain("I13sus4");
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

    expect(generatedPatterns).toContain("i7 IV9 i7 IV9");
    expect(generatedPatterns).toContain("I13 I13sus4 I13 I13sus4");
    expect(generatedPatterns).toContain("I7 I9");
    expect(generatedPatterns).toContain("i7 i9");
    expect(generatedPatterns).toContain("i7 bIII9");
    expect(generatedPatterns).toContain("i9 bII9");
  });

  it("makes one-chord-per-bar harmony rare in theme A", () => {
    let oneBarSections = 0;
    const sampleSize = 2_000;

    for (let seed = 0; seed < sampleSize; seed += 1) {
      const section = generateSectionA({
        seed: `slow-groove-${seed}`,
        settings: settings("strict", "medium", "major"),
        styleProfile: funkStyleProfile,
      }).value;

      oneBarSections += Number(
        section.chords.every(({ durationBars }) => durationBars === 1),
      );
    }

    expect(oneBarSections).toBeGreaterThan(0);
    expect(oneBarSections / sampleSize).toBeLessThan(0.05);
  });

  it("centers strict Funk grooves on the tonic, fourth and fifth roots", () => {
    let primaryRoots = 0;
    let allRoots = 0;

    for (let seed = 0; seed < 2_000; seed += 1) {
      const section = generateSectionA({
        seed: `primary-funk-roots-${seed}`,
        settings: settings("strict", "medium", "major"),
        styleProfile: funkStyleProfile,
      }).value;

      for (const chord of section.chords) {
        allRoots += 1;
        primaryRoots += Number(/^(?:IV|V|I)(?=maj|add|sus|6|7|9|11|13|$)/.test(chord.roman));
      }
    }

    expect(primaryRoots / allRoots).toBeGreaterThan(0.8);
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
            /^(?:b|#)?[ivIV]+(?:dim)?$/.test(roman ?? ""),
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
            /(?:maj7|maj9|6\/9|6|add2|add4|add9|sus2|sus4|7|9|11|13|dim)/.test(
              roman ?? "",
            ),
          ),
          `seed advanced-extensions-${mode}-${seed}`,
        ).toBe(true);
      }
    }
  });

  it("varies the first minor tonic between 7, 9, 11, and 13 on advanced", () => {
    const firstTonics = new Set<string>();
    const advancedSettings = settings("adventurous", "advanced", "minor");

    for (let seed = 0; seed < 600; seed += 1) {
      const result = generateSectionA({
        seed: `advanced-minor-tonic-${seed}`,
        settings: advancedSettings,
        styleProfile: funkStyleProfile,
      });
      const firstRoman = result.value.chords[0]?.roman;
      if (
        firstRoman === "i7" ||
        firstRoman === "i9" ||
        firstRoman === "i11" ||
        firstRoman === "i13"
      ) {
        firstTonics.add(firstRoman);
      }
    }

    expect(firstTonics).toEqual(new Set(["i7", "i9", "i11", "i13"]));
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

  it("keeps every single-chord vamp to one four-bar square", () => {
    let foundSingleChordVamp = false;

    for (let seed = 0; seed < 1_000; seed += 1) {
      const result = generateSectionA({
        seed: `four-bar-single-vamp-${seed}`,
        settings: settings("adventurous", "advanced", "major"),
        styleProfile: funkStyleProfile,
      });

      if (result.value.chords.length === 1) {
        foundSingleChordVamp = true;
        expect(result.value.bars).toBe(4);
        expect(result.value.chords[0]?.durationBars).toBe(4);
      }
    }

    expect(foundSingleChordVamp).toBe(true);
  });

  it("reserves rare half-bar turnarounds for development themes in 4/4", () => {
    let halfBarSections = 0;
    const sampleSize = 2_000;

    for (let seed = 0; seed < sampleSize; seed += 1) {
      const mediumSettings = settings("adventurous", "medium", "major");
      const sectionA = generateSectionA({
        seed: `half-bar-source-${seed}`,
        settings: mediumSettings,
        styleProfile: funkStyleProfile,
      }).value;
      const mediumResult = generateSectionB({
        seed: `half-bar-medium-${seed}`,
        settings: mediumSettings,
        styleProfile: funkStyleProfile,
        sectionA,
      });
      const easySettings = settings("adventurous", "easy", "major");
      const easyA = generateSectionA({
        seed: `half-bar-easy-source-${seed}`,
        settings: easySettings,
        styleProfile: funkStyleProfile,
      }).value;
      const easyResult = generateSectionB({
        seed: `half-bar-easy-${seed}`,
        settings: easySettings,
        styleProfile: funkStyleProfile,
        sectionA: easyA,
      });
      const threeFourSettings = {
        ...settings("adventurous", "advanced", "major"),
        meter: "3/4" as const,
      };
      const threeFourA = generateSectionA({
        seed: `half-bar-three-four-source-${seed}`,
        settings: threeFourSettings,
        styleProfile: funkStyleProfile,
      }).value;
      const threeFourResult = generateSectionB({
        seed: `half-bar-three-four-${seed}`,
        settings: threeFourSettings,
        styleProfile: funkStyleProfile,
        sectionA: threeFourA,
      });

      halfBarSections += Number(
        mediumResult.value.chords.some(({ durationBars }) => durationBars === 0.5),
      );
      mediumResult.value.chords.forEach((chord, index, chords) => {
        const previous = chords[index - 1];

        if (previous?.durationBars === 0.5 && chord.durationBars === 0.5) {
          expect(chord.roman, `seed half-bar-medium-${seed}`).not.toBe(
            previous.roman,
          );
          expect(
            new Set([previous.roman, chord.roman]),
            `chromatic half-bar pair for seed half-bar-medium-${seed}`,
          ).toEqual(new Set(["I9", "bII9"]));
        }
      });
      expect(
        easyResult.value.chords.some(({ durationBars }) => durationBars === 0.5),
      ).toBe(false);
      expect(
        threeFourResult.value.chords.some(
          ({ durationBars }) => durationBars === 0.5,
        ),
      ).toBe(false);
    }

    expect(halfBarSections).toBeGreaterThan(0);
    expect(halfBarSections / sampleSize).toBeLessThan(0.12);
  });

  it("can descend chromatically through v - bv - iv in a minor half-bar turnaround", () => {
    let foundChromaticDescent = false;
    const minorSettings = settings("adventurous", "medium", "minor");

    for (let seed = 0; seed < 5_000 && !foundChromaticDescent; seed += 1) {
      const sectionA = generateSectionA({
        seed: `minor-chromatic-source-${seed}`,
        settings: minorSettings,
        styleProfile: funkStyleProfile,
      }).value;
      const sectionB = generateSectionB({
        seed: `minor-chromatic-development-${seed}`,
        settings: minorSettings,
        styleProfile: funkStyleProfile,
        sectionA,
      }).value;
      const romans = sectionB.chords.slice(0, 3).map(({ roman }) => roman);

      foundChromaticDescent =
        /^v(?:7|9|11)$/.test(romans[0] ?? "") &&
        /^bv(?:7|9)$/.test(romans[1] ?? "") &&
        /^iv(?:7|9|11)$/.test(romans[2] ?? "") &&
        sectionB.chords.some(({ durationBars }) => durationBars === 0.5);
    }

    expect(foundChromaticDescent).toBe(true);
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
      expect(
        funkStyleProfile.sectionRules.A.allowedStartFunctions.some(
          ({ value }) => value === result.value.chords[0]?.harmonicFunction,
        ),
      ).toBe(true);
      expect(result.usedFallback).toBe(false);
    }
  });

  it("starts theme A on the root tonic about 70% of the time", () => {
    let tonicStarts = 0;
    const sampleSize = 1_000;

    for (let seed = 0; seed < sampleSize; seed += 1) {
      const firstRoman = generateSectionA({
        seed: `theme-a-start-rate-${seed}`,
        settings: settings("colorful", "medium", "major"),
        styleProfile: funkStyleProfile,
      }).value.chords[0]?.roman;

      if (firstRoman && (/^I(?:maj|\d|$)/.test(firstRoman))) tonicStarts += 1;
    }

    expect(tonicStarts / sampleSize).toBeGreaterThan(0.65);
    expect(tonicStarts / sampleSize).toBeLessThan(0.75);
  });

  it("uses third-degree tonic substitutes rarely", () => {
    let sectionsWithThirdDegree = 0;
    const sampleSize = 1_000;

    for (let seed = 0; seed < sampleSize; seed += 1) {
      const section = generateSectionA({
        seed: `third-degree-${seed}`,
        settings: settings("strict", "medium", "major"),
        styleProfile: funkStyleProfile,
      }).value;

      if (section.chords.some(({ roman }) => roman === "iii7")) {
        sectionsWithThirdDegree += 1;
      }
    }

    expect(sectionsWithThirdDegree).toBeGreaterThan(0);
    expect(sectionsWithThirdDegree / sampleSize).toBeLessThan(0.25);
  });
});
