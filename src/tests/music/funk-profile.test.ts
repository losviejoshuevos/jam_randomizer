import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type { Complexity, GenerationSettings, Mode } from "@/lib/music/domain/types";
import {
  createActiveHarmonicPools,
  getAvailableChordDefinitions,
} from "@/lib/music/harmony/availability";
import { createSeededRandom } from "@/lib/music/random";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";

describe("Funk style profile", () => {
  it("is JSON serializable and supports the MVP meters", () => {
    const serialized = JSON.stringify(funkStyleProfile);
    const parsed = JSON.parse(serialized) as typeof funkStyleProfile;

    expect(parsed.id).toBe("funk");
    expect(parsed.allowedMeters.map(({ value }) => value)).toEqual(["4/4", "3/4"]);
    expect(serialized).not.toContain("undefined");
    expect(parsed.bpmRange).toEqual({ min: 98, max: 118 });
  });

  it("keeps tonal freedom levels progressively broader", () => {
    expect(funkStyleProfile.harmonicPoolWeights.strict.nearby).toBe(0);
    expect(funkStyleProfile.harmonicPoolWeights.colorful.nearby).toBeGreaterThan(0);
    expect(funkStyleProfile.harmonicPoolWeights.colorful["chromatic-near"]).toBe(0);
    expect(funkStyleProfile.harmonicPoolWeights.adventurous["chromatic-far"]).toBeGreaterThan(0);
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

  it("uses the agreed relative-major pitch collection at strict freedom", () => {
    const strictEasy = (mode: Mode, key: "C" | "A") =>
      new Set(
        getAvailableChordDefinitions(funkStyleProfile, {
          styleId: "funk",
          key,
          mode,
          bpm: 100,
          meter: "4/4",
          complexity: "easy",
          harmonicFreedom: "strict",
          timing: {
            sectionADurationSeconds: 150,
            sectionBDurationSeconds: 90,
            transitionWarningSeconds: 10,
          },
        }).map(({ roman }) => renderRomanChord(roman, key, mode)),
      );

    expect(strictEasy("major", "C")).toEqual(
      new Set(["C", "Am", "F", "Dm", "G", "Em"]),
    );
    expect(strictEasy("minor", "A")).toEqual(
      new Set(["Am", "C", "F", "Dm", "G", "Em"]),
    );
  });

  it("adds the agreed nearby chords at colorful freedom", () => {
    const settings: GenerationSettings = {
      styleId: "funk",
      key: "C",
      mode: "major",
      bpm: 100,
      meter: "4/4",
      complexity: "easy",
      harmonicFreedom: "colorful",
      timing: {
        sectionADurationSeconds: 150,
        sectionBDurationSeconds: 90,
        transitionWarningSeconds: 10,
      },
    };
    const rendered = new Set(
      getAvailableChordDefinitions(funkStyleProfile, settings).map(({ roman }) =>
        renderRomanChord(roman, "C", "major"),
      ),
    );

    for (const chord of ["Bb", "Gm", "D", "Bm", "Bdim", "Db"]) {
      expect(rendered).toContain(chord);
    }

    const aMinorRendered = new Set(
      getAvailableChordDefinitions(funkStyleProfile, {
        ...settings,
        key: "A",
        mode: "minor",
      }).map(({ roman }) => renderRomanChord(roman, "A", "minor")),
    );
    expect(aMinorRendered).toEqual(
      new Set(["Am", "C", "F", "Dm", "G", "Em", "Bb", "Gm", "D", "Bm", "Bdim"]),
    );
  });

  it("keeps extensions on the root's harmonic function", () => {
    const tonicExtensions = funkStyleProfile.chordVocabulary.filter(
      ({ roman, allowedModes }) =>
        allowedModes.includes("major") && /^I(?:maj|add|sus|6|7|9|11|13|$)/.test(roman),
    );
    const dominantExtensions = funkStyleProfile.chordVocabulary.filter(
      ({ roman, allowedModes }) =>
        allowedModes.includes("major") && /^V(?:add|sus|6|7|9|11|13|$)/.test(roman),
    );

    expect(tonicExtensions.length).toBeGreaterThan(5);
    expect(tonicExtensions.every(({ harmonicFunction }) => harmonicFunction === "tonic")).toBe(true);
    expect(dominantExtensions.length).toBeGreaterThan(5);
    expect(dominantExtensions.every(({ harmonicFunction }) => harmonicFunction === "dominant")).toBe(true);
  });

  it("activates adventurous chromatic pools once per card at 80/60/20", () => {
    const settings: GenerationSettings = {
      styleId: "funk",
      key: "C",
      mode: "major",
      bpm: 100,
      meter: "4/4",
      complexity: "advanced",
      harmonicFreedom: "adventurous",
      timing: {
        sectionADurationSeconds: 150,
        sectionBDurationSeconds: 90,
        transitionWarningSeconds: 10,
      },
    };
    const counts = {
      "chromatic-near": 0,
      "chromatic-medium": 0,
      "chromatic-far": 0,
    };
    const samples = 5_000;

    for (let index = 0; index < samples; index += 1) {
      const pools = createActiveHarmonicPools(
        settings,
        createSeededRandom(`pool-card-${index}`),
      );
      for (const pool of Object.keys(counts) as (keyof typeof counts)[]) {
        if (pools.has(pool)) counts[pool] += 1;
      }
    }

    expect(counts["chromatic-near"] / samples).toBeCloseTo(0.8, 1);
    expect(counts["chromatic-medium"] / samples).toBeCloseTo(0.6, 1);
    expect(counts["chromatic-far"] / samples).toBeCloseTo(0.2, 1);
  });
});
