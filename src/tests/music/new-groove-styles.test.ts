import { describe, expect, it } from "vitest";
import {
  COUNTRY_ARCHETYPES,
  DISCO_ARCHETYPES,
  NEO_SOUL_ARCHETYPES,
  REGGAE_ARCHETYPES,
  resolveCountryStyleProfile,
  resolveDiscoStyleProfile,
  resolveNeoSoulStyleProfile,
  resolveReggaeStyleProfile,
} from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Mode,
  SectionHarmonySettings,
  SectionLabel,
} from "@/lib/music/domain/types";
import {
  generateSession,
  regenerateSessionSections,
} from "@/lib/music/generator";
import { getAvailableChordDefinitions } from "@/lib/music/harmony/availability";

const STYLES = [
  { id: "neo-soul", archetypes: NEO_SOUL_ARCHETYPES, resolve: resolveNeoSoulStyleProfile },
  { id: "reggae", archetypes: REGGAE_ARCHETYPES, resolve: resolveReggaeStyleProfile },
  { id: "disco", archetypes: DISCO_ARCHETYPES, resolve: resolveDiscoStyleProfile },
  { id: "country", archetypes: COUNTRY_ARCHETYPES, resolve: resolveCountryStyleProfile },
] as const;

function settings(
  styleId: string,
  mode: Mode,
  complexity: Complexity = "medium",
  harmonicFreedom: HarmonicFreedom = "colorful",
): GenerationSettings {
  return {
    styleId,
    key: mode === "minor" ? "D" : "C",
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

describe("new groove-oriented styles", () => {
  it("selects every archetype deterministically and respects its BPM range", () => {
    for (const style of STYLES) {
      const seen = new Set<string>();
      for (let index = 0; index < 3_000; index += 1) {
        const seed = `${style.id}-distribution-${index}`;
        const profile = style.resolve(seed);
        expect(style.resolve(seed).archetypeId).toBe(profile.archetypeId);
        seen.add(profile.archetypeId ?? "");
        if (index < 120) {
          const session = generateSession({
            seed,
            settings: settings(style.id, "major"),
            styleProfile: profile,
          }).value;
          expect(session.bpm).toBeGreaterThanOrEqual(profile.bpmRange.min);
          expect(session.bpm).toBeLessThanOrEqual(profile.bpmRange.max);
        }
      }
      expect(seen).toEqual(new Set(style.archetypes.map(({ id }) => id)));
    }
  });

  it("generates playable and contrasting A-D themes for every archetype", () => {
    for (const style of STYLES) {
      for (const archetype of style.archetypes) {
        for (const mode of ["major", "minor"] as const) {
          for (let index = 0; index < 18; index += 1) {
            const seed = `${style.id}-${archetype.id}-${mode}-${index}`;
            const profile = style.resolve(seed, archetype.id);
            const original = generateSession({
              seed,
              settings: settings(style.id, mode, "advanced", "adventurous"),
              styleProfile: profile,
            }).value;
            const expanded = regenerateSessionSections({
              session: original,
              sectionLabels: ["C", "D"],
              sectionSettings: sectionSettings(mode, "advanced", "adventurous"),
              seed: `${seed}-CD`,
              styleProfile: profile,
            }).value;

            const structures = expanded.sections.map((section) => {
              expect(section.chords.length).toBeGreaterThan(0);
              expect(section.chords.length).toBeLessThanOrEqual(8);
              expect(section.chords.reduce((sum, chord) => sum + chord.durationBars, 0)).toBe(section.bars);
              expect(section.chords.every(({ renderedSymbol }) => renderedSymbol.length > 0)).toBe(true);
              return section.chords.map(({ roman }) => roman.replace(/(?:maj7|maj9|6\/9|add9|sus2|sus4|7sus4|9sus4|13sus4|11|13|9|7|6)$/, "")).join("|");
            });
            expect(new Set(structures).size).toBeGreaterThanOrEqual(2);
            expect(expanded.sections.find(({ label }) => label === "D")?.chords.at(-1)?.harmonicFunction).toBe("tonic");
          }
        }
      }
    }
  });

  it("keeps harmonic freedom independent from extension complexity", () => {
    for (const style of STYLES) {
      let easyExtensions = 0;
      let advancedExtensions = 0;
      let advancedTotal = 0;
      for (let index = 0; index < 240; index += 1) {
        const profile = style.resolve(`${style.id}-controls-${index}`);
        const easy = generateSession({
          seed: `${style.id}-easy-${index}`,
          settings: settings(style.id, "major", "easy", "adventurous"),
          styleProfile: profile,
        }).value;
        const advanced = generateSession({
          seed: `${style.id}-advanced-${index}`,
          settings: settings(style.id, "major", "advanced", "strict"),
          styleProfile: profile,
        }).value;
        easyExtensions += easy.sections.flatMap(({ chords }) => chords).filter(({ roman }) => /(?:maj|sus|add|6|7|9|11|13)/.test(roman)).length;
        for (const chord of advanced.sections.flatMap(({ chords }) => chords)) {
          advancedTotal += 1;
          if (/(?:maj|sus|add|6|7|9|11|13)/.test(chord.roman)) advancedExtensions += 1;
        }
      }
      expect(easyExtensions).toBe(0);
      expect(advancedExtensions / advancedTotal).toBeGreaterThan(0.35);
    }
  });

  it("preserves the intended harmonic density of each family", () => {
    let reggaeChordCount = 0;
    let reggaeSections = 0;
    let countryVeryComplex = 0;
    let countryTotal = 0;
    let neoRich = 0;
    let neoTotal = 0;
    for (let index = 0; index < 500; index += 1) {
      const reggaeProfile = resolveReggaeStyleProfile(`reggae-density-${index}`, "dub-vamp");
      const reggae = generateSession({ seed: `reggae-density-${index}`, settings: settings("reggae", "minor", "medium", "colorful"), styleProfile: reggaeProfile }).value;
      for (const section of reggae.sections) {
        reggaeChordCount += section.chords.length;
        reggaeSections += 1;
      }

      const countryProfile = resolveCountryStyleProfile(`country-density-${index}`, "honky-tonk");
      const country = generateSession({ seed: `country-density-${index}`, settings: settings("country", "major", "advanced", "colorful"), styleProfile: countryProfile }).value;
      for (const chord of country.sections.flatMap(({ chords }) => chords)) {
        countryTotal += 1;
        if (/(?:maj9|#11|alt|13sus|11)/.test(chord.roman)) countryVeryComplex += 1;
      }

      const neoProfile = resolveNeoSoulStyleProfile(`neo-density-${index}`, "neo-soul-vamp");
      const neo = generateSession({ seed: `neo-density-${index}`, settings: settings("neo-soul", "minor", "advanced", "colorful"), styleProfile: neoProfile }).value;
      for (const chord of neo.sections.flatMap(({ chords }) => chords)) {
        neoTotal += 1;
        if (/(?:maj|6\/9|7|9|11|13)/.test(chord.roman)) neoRich += 1;
      }
    }
    expect(reggaeChordCount / reggaeSections).toBeLessThan(3.5);
    expect(countryVeryComplex / countryTotal).toBeLessThan(0.03);
    expect(neoRich / neoTotal).toBeGreaterThan(0.65);
  });

  it("widens the manual replacement list for complexity and freedom", () => {
    for (const style of STYLES) {
      const profile = style.resolve(`${style.id}-manual-list`);
      const easyStrict = getAvailableChordDefinitions(
        profile,
        settings(style.id, "major", "easy", "strict"),
      );
      const advancedStrict = getAvailableChordDefinitions(
        profile,
        settings(style.id, "major", "advanced", "strict"),
      );
      const advancedAdventurous = getAvailableChordDefinitions(
        profile,
        settings(style.id, "major", "advanced", "adventurous"),
      );
      expect(advancedStrict.length).toBeGreaterThan(easyStrict.length);
      expect(advancedAdventurous.length).toBeGreaterThan(advancedStrict.length);
    }
  });
});
