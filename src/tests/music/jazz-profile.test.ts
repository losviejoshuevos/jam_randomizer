import { describe, expect, it } from "vitest";
import { JAZZ_ARCHETYPES, resolveJazzStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Meter,
  Mode,
  SectionHarmonySettings,
  SectionLabel,
} from "@/lib/music/domain/types";
import { generateSession, regenerateSessionSections } from "@/lib/music/generator";

function settings(
  mode: Mode = "major",
  complexity: Complexity = "medium",
  harmonicFreedom: HarmonicFreedom = "colorful",
  meter: Meter = "4/4",
): GenerationSettings {
  return {
    styleId: "jazz",
    key: mode === "minor" ? "D" : "C",
    mode,
    bpm: "random",
    meter,
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
  complexity: Complexity,
  harmonicFreedom: HarmonicFreedom,
): Record<SectionLabel, SectionHarmonySettings> {
  const value: SectionHarmonySettings = {
    key: mode === "minor" ? "D" : "C",
    mode,
    complexity,
    harmonicFreedom,
  };
  return { A: value, B: value, C: value, D: value };
}

describe("Jazz style", () => {
  it("selects every hidden archetype deterministically near its configured weight", () => {
    const counts = new Map<string, number>();
    const sampleSize = 8_000;
    for (let index = 0; index < sampleSize; index += 1) {
      const seed = `jazz-distribution-${index}`;
      const first = resolveJazzStyleProfile(seed);
      expect(resolveJazzStyleProfile(seed).archetypeId).toBe(first.archetypeId);
      counts.set(first.archetypeId ?? "", (counts.get(first.archetypeId ?? "") ?? 0) + 1);
    }
    for (const archetype of JAZZ_ARCHETYPES) {
      const actual = (counts.get(archetype.id) ?? 0) / sampleSize;
      expect(actual).toBeGreaterThan(archetype.weight / 100 - 0.03);
      expect(actual).toBeLessThan(archetype.weight / 100 + 0.03);
    }
  });

  it("generates playable and structurally distinct A-D themes for every archetype", () => {
    for (const archetype of JAZZ_ARCHETYPES) {
      for (const mode of ["major", "minor"] as const) {
        for (let index = 0; index < 32; index += 1) {
          const seed = `JAZZ-${archetype.id}-${mode}-${index}`;
          const profile = resolveJazzStyleProfile(seed, archetype.id);
          const original = generateSession({
            seed,
            settings: settings(mode, "advanced", "adventurous"),
            styleProfile: profile,
          }).value;
          const expanded = regenerateSessionSections({
            session: original,
            sectionLabels: ["C", "D"],
            sectionSettings: allSectionSettings(mode, "advanced", "adventurous"),
            seed: `${seed}-CD`,
            styleProfile: profile,
          }).value;

          const structures = expanded.sections.map((section) => {
            expect(section.chords.length).toBeGreaterThan(0);
            expect(section.chords.length).toBeLessThanOrEqual(8);
            expect(section.chords.reduce((sum, chord) => sum + chord.durationBars, 0)).toBe(section.bars);
            expect(section.chords.every(({ renderedSymbol }) => renderedSymbol.length > 0)).toBe(true);
            return section.chords.map(({ harmonicFunction }) => harmonicFunction).join("|");
          });
          expect(new Set(structures).size).toBeGreaterThanOrEqual(2);
          expect(expanded.sections.find(({ label }) => label === "D")?.chords.at(-1)?.harmonicFunction).toBe("tonic");
        }
      }
    }
  });

  it("keeps harmonic freedom and chord complexity independent", () => {
    let easyExtended = 0;
    let advancedExtended = 0;
    let advancedTotal = 0;
    let adventurousChromatic = 0;
    for (let index = 0; index < 600; index += 1) {
      const profile = resolveJazzStyleProfile(`jazz-controls-${index}`, "swing-standard");
      const easy = generateSession({ seed: `jazz-easy-${index}`, settings: settings("major", "easy", "adventurous"), styleProfile: profile }).value;
      const advanced = generateSession({ seed: `jazz-advanced-${index}`, settings: settings("major", "advanced", "strict"), styleProfile: profile }).value;
      easyExtended += easy.sections.flatMap(({ chords }) => chords).filter(({ roman }) => /(?:maj|sus|dim|alt|6|7|9|11|13)/.test(roman)).length;
      for (const chord of advanced.sections.flatMap(({ chords }) => chords)) {
        advancedTotal += 1;
        if (/(?:maj|sus|dim|alt|6|7|9|11|13)/.test(chord.roman)) advancedExtended += 1;
      }
      adventurousChromatic += easy.sections.flatMap(({ chords }) => chords).filter(({ roman }) => /^(?:II|III|VI|bII|#IV)/.test(roman)).length;
    }
    expect(easyExtended).toBe(0);
    expect(advancedExtended / advancedTotal).toBeGreaterThan(0.7);
    expect(adventurousChromatic).toBeGreaterThan(50);
  });

  it("keeps modal harmony sparse and removes half-bar events from 3/4", () => {
    for (let index = 0; index < 240; index += 1) {
      const seed = `jazz-modal-${index}`;
      const profile = resolveJazzStyleProfile(seed, "modal-quartal");
      const modal = generateSession({ seed, settings: settings("minor", "advanced", "adventurous"), styleProfile: profile }).value;
      expect(modal.sections[0]?.chords.length).toBeLessThanOrEqual(4);

      const bebop = resolveJazzStyleProfile(seed, "bebop-cycle");
      const waltzSession = generateSession({ seed, settings: settings("major", "advanced", "adventurous", "3/4"), styleProfile: bebop }).value;
      expect(waltzSession.sections.flatMap(({ chords }) => chords).every(({ durationBars }) => Number.isInteger(durationBars))).toBe(true);
    }
  });

  it("resolves random BPM inside each archetype range", () => {
    for (const archetype of JAZZ_ARCHETYPES) {
      for (let index = 0; index < 100; index += 1) {
        const seed = `JAZZ-tempo-${archetype.id}-${index}`;
        const profile = resolveJazzStyleProfile(seed, archetype.id);
        const session = generateSession({ seed, settings: settings(), styleProfile: profile }).value;
        expect(session.bpm).toBeGreaterThanOrEqual(archetype.bpmRange.min);
        expect(session.bpm).toBeLessThanOrEqual(archetype.bpmRange.max);
      }
    }
  });
});
