import { describe, expect, it } from "vitest";
import {
  BLUES_ARCHETYPES,
  resolveBluesStyleProfile,
} from "@/data/styles";
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
    styleId: "blues",
    key: mode === "minor" ? "E" : "A",
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

function sectionSettings(
  mode: Mode,
  complexity: Complexity = "medium",
  harmonicFreedom: HarmonicFreedom = "colorful",
): Record<SectionLabel, SectionHarmonySettings> {
  const value = {
    key: mode === "minor" ? "E" as const : "A" as const,
    mode,
    complexity,
    harmonicFreedom,
  };
  return { A: value, B: value, C: value, D: value };
}

describe("Blues style", () => {
  it("selects every archetype deterministically with its configured weight", () => {
    const counts = new Map<string, number>();
    const sampleSize = 6_000;
    for (let index = 0; index < sampleSize; index += 1) {
      const seed = `blues-distribution-${index}`;
      const first = resolveBluesStyleProfile(seed);
      const second = resolveBluesStyleProfile(seed);
      expect(second.archetypeId).toBe(first.archetypeId);
      counts.set(first.archetypeId ?? "", (counts.get(first.archetypeId ?? "") ?? 0) + 1);
    }
    for (const archetype of BLUES_ARCHETYPES) {
      const actual = (counts.get(archetype.id) ?? 0) / sampleSize;
      expect(actual).toBeGreaterThan(archetype.weight / 100 - 0.035);
      expect(actual).toBeLessThan(archetype.weight / 100 + 0.035);
    }
  });

  it("keeps every generated form playable and within the editor card limit", () => {
    for (const archetype of BLUES_ARCHETYPES) {
      for (let index = 0; index < 80; index += 1) {
        const seed = `BLUES-${archetype.id}-${index}`;
        const profile = resolveBluesStyleProfile(seed, archetype.id);
        const original = generateSession({ seed, settings: settings(), styleProfile: profile }).value;
        const expanded = regenerateSessionSections({
          session: original,
          sectionLabels: ["C", "D"],
          sectionSettings: sectionSettings("major"),
          seed: `${seed}-CD`,
          styleProfile: profile,
        }).value;

        for (const section of expanded.sections) {
          expect([4, 8, 12, 16]).toContain(section.bars);
          expect(section.chords.length).toBeGreaterThan(0);
          expect(section.chords.length).toBeLessThanOrEqual(8);
          expect(section.chords.reduce((sum, chord) => sum + chord.durationBars, 0)).toBe(section.bars);
        }
        expect(expanded.sections.find(({ label }) => label === "D")?.chords.at(-1)?.harmonicFunction).toBe("tonic");
      }
    }
  });

  it("preserves the characteristic form family of every archetype", () => {
    const expectedBars: Record<string, number[]> = {
      "classic-12": [12],
      "chicago-stop": [12, 16],
      "texas-shuffle": [8, 12],
      "minor-modern": [12],
      "slow-blues": [12],
      "one-chord-boogie": [4, 8],
      "eight-bar-roadhouse": [8],
    };
    for (const archetype of BLUES_ARCHETYPES) {
      const observed = new Set<number>();
      for (let index = 0; index < 180; index += 1) {
        const seed = `BLUES-form-${archetype.id}-${index}`;
        const profile = resolveBluesStyleProfile(seed, archetype.id);
        const session = generateSession({ seed, settings: settings(), styleProfile: profile }).value;
        session.sections.forEach(({ bars }) => observed.add(bars));
      }
      expect([...observed].every((bars) => expectedBars[archetype.id]!.includes(bars))).toBe(true);
      for (const bars of expectedBars[archetype.id]!) expect(observed.has(bars)).toBe(true);
    }
  });

  it("renders minor tonic and subdominant as minor, while V remains dominant", () => {
    for (const archetype of BLUES_ARCHETYPES) {
      for (let index = 0; index < 90; index += 1) {
        const seed = `BLUES-minor-${archetype.id}-${index}`;
        const profile = resolveBluesStyleProfile(seed, archetype.id);
        const session = generateSession({ seed, settings: settings("minor", "easy", "strict"), styleProfile: profile }).value;
        const chords = session.sections.flatMap(({ chords }) => chords);
        expect(chords.some(({ roman }) => roman.startsWith("I7") || roman.startsWith("IV7"))).toBe(false);
        expect(chords.some(({ renderedSymbol }) => renderedSymbol === "E7" || renderedSymbol === "A7")).toBe(false);
        expect(chords.some(({ roman }) => roman.startsWith("v"))).toBe(false);
        if (archetype.id !== "one-chord-boogie") {
          expect(chords.some(({ roman }) => roman === "V7")).toBe(true);
        }
      }
    }
  });

  it("uses complexity for extensions and freedom for harmonic substitutions", () => {
    let easyExtended = 0;
    let easyTotal = 0;
    let advancedExtended = 0;
    let advancedTotal = 0;
    let adventurousSubstitutions = 0;

    for (let index = 0; index < 500; index += 1) {
      const seed = `BLUES-controls-${index}`;
      const profile = resolveBluesStyleProfile(seed, "classic-12");
      const easy = generateSession({ seed: `${seed}-easy`, settings: settings("major", "easy", "strict"), styleProfile: profile }).value;
      const advanced = generateSession({ seed: `${seed}-advanced`, settings: settings("major", "advanced", "adventurous"), styleProfile: profile }).value;

      for (const chord of easy.sections.flatMap(({ chords }) => chords)) {
        easyTotal += 1;
        if (/(?:9|11|13|sus|dim)/.test(chord.roman)) easyExtended += 1;
      }
      for (const chord of advanced.sections.flatMap(({ chords }) => chords)) {
        advancedTotal += 1;
        if (/(?:9|11|13|sus|dim)/.test(chord.roman)) advancedExtended += 1;
        if (/^(?:#IV|ii)/.test(chord.roman)) adventurousSubstitutions += 1;
      }
    }

    expect(easyExtended / easyTotal).toBe(0);
    expect(advancedExtended / advancedTotal).toBeGreaterThan(0.45);
    expect(adventurousSubstitutions).toBeGreaterThan(20);
  });

  it("resolves random BPM inside each archetype range", () => {
    for (const archetype of BLUES_ARCHETYPES) {
      for (let index = 0; index < 100; index += 1) {
        const seed = `BLUES-tempo-${archetype.id}-${index}`;
        const profile = resolveBluesStyleProfile(seed, archetype.id);
        const session = generateSession({ seed, settings: settings(), styleProfile: profile }).value;
        expect(session.bpm).toBeGreaterThanOrEqual(archetype.bpmRange.min);
        expect(session.bpm).toBeLessThanOrEqual(archetype.bpmRange.max);
      }
    }
  });
});
