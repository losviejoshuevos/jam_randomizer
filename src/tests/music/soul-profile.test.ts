import { describe, expect, it } from "vitest";
import { SOUL_ARCHETYPES, resolveSoulStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Mode,
  SectionHarmonySettings,
  SectionLabel,
} from "@/lib/music/domain/types";
import { generateSession, regenerateSessionSections } from "@/lib/music/generator";

function settings(
  mode: Mode = "major",
  complexity: Complexity = "medium",
  harmonicFreedom: HarmonicFreedom = "colorful",
): GenerationSettings {
  return {
    styleId: "soul",
    key: mode === "minor" ? "A" : "C",
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

function allSectionSettings(
  mode: Mode,
  complexity: Complexity = "medium",
  harmonicFreedom: HarmonicFreedom = "colorful",
): Record<SectionLabel, SectionHarmonySettings> {
  const value: SectionHarmonySettings = {
    key: mode === "minor" ? "A" : "C",
    mode,
    complexity,
    harmonicFreedom,
  };
  return { A: value, B: value, C: value, D: value };
}

describe("Soul style", () => {
  it("selects every hidden archetype deterministically near its configured weight", () => {
    const counts = new Map<string, number>();
    const sampleSize = 6_000;
    for (let index = 0; index < sampleSize; index += 1) {
      const seed = `soul-distribution-${index}`;
      const first = resolveSoulStyleProfile(seed);
      expect(resolveSoulStyleProfile(seed).archetypeId).toBe(first.archetypeId);
      counts.set(first.archetypeId ?? "", (counts.get(first.archetypeId ?? "") ?? 0) + 1);
    }
    for (const archetype of SOUL_ARCHETYPES) {
      const actual = (counts.get(archetype.id) ?? 0) / sampleSize;
      expect(actual).toBeGreaterThan(archetype.weight / 100 - 0.035);
      expect(actual).toBeLessThan(archetype.weight / 100 + 0.035);
    }
  });

  it("generates playable A-D forms for every archetype, mode and control level", () => {
    for (const archetype of SOUL_ARCHETYPES) {
      for (const mode of ["major", "minor"] as const) {
        for (const complexity of ["easy", "medium", "advanced"] as const) {
          for (let index = 0; index < 20; index += 1) {
            const seed = `SOUL-${archetype.id}-${mode}-${complexity}-${index}`;
            const profile = resolveSoulStyleProfile(seed, archetype.id);
            const original = generateSession({
              seed,
              settings: settings(mode, complexity, "adventurous"),
              styleProfile: profile,
            }).value;
            const expanded = regenerateSessionSections({
              session: original,
              sectionLabels: ["C", "D"],
              sectionSettings: allSectionSettings(mode, complexity, "adventurous"),
              seed: `${seed}-CD`,
              styleProfile: profile,
            }).value;

            for (const section of expanded.sections) {
              expect(section.chords.length).toBeGreaterThan(0);
              expect(section.chords.length).toBeLessThanOrEqual(8);
              expect(section.chords.reduce((sum, chord) => sum + chord.durationBars, 0)).toBe(section.bars);
              expect(section.chords.every(({ renderedSymbol }) => renderedSymbol.length > 0)).toBe(true);
            }
            expect(expanded.sections.find(({ label }) => label === "D")?.chords.at(-1)?.harmonicFunction).toBe("tonic");
          }
        }
      }
    }
  });

  it("keeps easy chords plain and lets complexity, not freedom, add extensions", () => {
    let easyExtended = 0;
    let advancedExtended = 0;
    let advancedTotal = 0;
    for (let index = 0; index < 500; index += 1) {
      const profile = resolveSoulStyleProfile(`soul-controls-${index}`, "stax-groove");
      const easy = generateSession({
        seed: `soul-easy-${index}`,
        settings: settings("major", "easy", "adventurous"),
        styleProfile: profile,
      }).value;
      const advanced = generateSession({
        seed: `soul-advanced-${index}`,
        settings: settings("major", "advanced", "strict"),
        styleProfile: profile,
      }).value;
      easyExtended += easy.sections.flatMap(({ chords }) => chords).filter(({ roman }) => /(?:maj|add|sus|6|7|9|11|13|dim)/.test(roman)).length;
      for (const chord of advanced.sections.flatMap(({ chords }) => chords)) {
        advancedTotal += 1;
        if (/(?:maj|add|sus|6|7|9|11|13|dim)/.test(chord.roman)) advancedExtended += 1;
      }
    }
    expect(easyExtended).toBe(0);
    expect(advancedExtended / advancedTotal).toBeGreaterThan(0.72);
  });

  it("keeps minor tonic minor and allows characteristic Dorian major IV", () => {
    let dorianFourth = 0;
    for (let index = 0; index < 300; index += 1) {
      const seed = `soul-minor-${index}`;
      const profile = resolveSoulStyleProfile(seed, "minor-vamp");
      const session = generateSession({ seed, settings: settings("minor", "easy", "strict"), styleProfile: profile }).value;
      const chords = session.sections.flatMap(({ chords }) => chords);
      expect(chords.some(({ harmonicFunction, renderedSymbol }) => harmonicFunction === "tonic" && renderedSymbol === "A")).toBe(false);
      if (chords.some(({ roman }) => roman === "IV")) dorianFourth += 1;
    }
    expect(dorianFourth).toBeGreaterThan(100);
  });

  it("makes development structurally different from the main theme", () => {
    const root = (roman: string) => roman.replace(/(?:maj7|maj9|6\/9|add2|add4|add9|sus2|sus4|7sus4|9sus4|13sus4|7#9|7b9|7b5|dim7|dim|aug|11|13|9|7|6|5)$/, "");
    for (const archetype of SOUL_ARCHETYPES) {
      for (const mode of ["major", "minor"] as const) {
        for (let index = 0; index < 120; index += 1) {
          const seed = `SOUL-development-${archetype.id}-${mode}-${index}`;
          const profile = resolveSoulStyleProfile(seed, archetype.id);
          const session = generateSession({
            seed,
            settings: settings(mode, "medium", "colorful"),
            styleProfile: profile,
          }).value;
          const [sectionA, sectionB] = session.sections;
          const aStructure = sectionA?.chords.map(({ roman }) => root(roman)).join("|");
          const bStructure = sectionB?.chords.map(({ roman }) => root(roman)).join("|");
          expect(bStructure).not.toBe(aStructure);

          if (index < 20) {
            const expanded = regenerateSessionSections({
              session,
              sectionLabels: ["C", "D"],
              sectionSettings: allSectionSettings(mode, "medium", "colorful"),
              seed: `${seed}-CD`,
              styleProfile: profile,
            }).value;
            const structures = expanded.sections.map(({ chords }) =>
              chords.map(({ roman }) => root(roman)).join("|"),
            );
            expect(new Set(structures).size).toBe(structures.length);
          }
        }
      }
    }
  });

  it("resolves random BPM inside every archetype range", () => {
    for (const archetype of SOUL_ARCHETYPES) {
      for (let index = 0; index < 100; index += 1) {
        const seed = `SOUL-tempo-${archetype.id}-${index}`;
        const profile = resolveSoulStyleProfile(seed, archetype.id);
        const session = generateSession({ seed, settings: settings(), styleProfile: profile }).value;
        expect(session.bpm).toBeGreaterThanOrEqual(archetype.bpmRange.min);
        expect(session.bpm).toBeLessThanOrEqual(archetype.bpmRange.max);
      }
    }
  });
});
