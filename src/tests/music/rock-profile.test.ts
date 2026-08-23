import { describe, expect, it } from "vitest";
import {
  ROCK_ARCHETYPES,
  resolveRockMode,
  resolveRockStyleProfile,
} from "@/data/styles";
import type {
  GenerationSettings,
  Mode,
  SectionHarmonySettings,
  SectionLabel,
} from "@/lib/music/domain/types";
import {
  generateSession,
  regenerateSessionSections,
} from "@/lib/music/generator";
import { formatRomanChord } from "@/lib/music/rendering/format-roman-chord";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";

function settings(mode: Mode, complexity: GenerationSettings["complexity"] = "medium"): GenerationSettings {
  return {
    styleId: "rock",
    key: mode === "major" ? "C" : "A",
    mode,
    bpm: "random",
    meter: "4/4",
    complexity,
    harmonicFreedom: "adventurous",
    timing: {
      sectionADurationSeconds: 150,
      sectionBDurationSeconds: 90,
      transitionWarningSeconds: 10,
    },
  };
}

function allSectionSettings(mode: Mode): Record<SectionLabel, SectionHarmonySettings> {
  const value: SectionHarmonySettings = {
    key: mode === "major" ? "C" : "A",
    mode,
    complexity: "medium",
    harmonicFreedom: "adventurous",
  };
  return { A: value, B: value, C: value, D: value };
}

describe("Rock style", () => {
  it("selects every archetype deterministically with an approximate configured distribution", () => {
    const counts = new Map<string, number>();
    const sampleSize = 6_000;
    for (let index = 0; index < sampleSize; index += 1) {
      const seed = `rock-distribution-${index}`;
      const first = resolveRockStyleProfile(seed);
      const second = resolveRockStyleProfile(seed);
      expect(second.archetypeId).toBe(first.archetypeId);
      expect(second.chordTreatment).toBe(first.chordTreatment);
      counts.set(first.archetypeId ?? "", (counts.get(first.archetypeId ?? "") ?? 0) + 1);
    }
    for (const archetype of ROCK_ARCHETYPES) {
      const actual = (counts.get(archetype.id) ?? 0) / sampleSize;
      expect(actual).toBeGreaterThan(archetype.weight / 100 - 0.035);
      expect(actual).toBeLessThan(archetype.weight / 100 + 0.035);
    }
  });

  it("keeps one hidden archetype and chord treatment for every theme", () => {
    const seed = "ROCK-SAME-SESSION";
    const profile = resolveRockStyleProfile(seed);
    const original = generateSession({ seed, settings: settings("minor"), styleProfile: profile }).value;
    const expanded = regenerateSessionSections({
      session: original,
      sectionLabels: ["C", "D"],
      sectionSettings: allSectionSettings("minor"),
      seed: "ROCK-SAME-SESSION-CD",
      styleProfile: profile,
    }).value;
    expect(expanded.styleArchetypeId).toBe(profile.archetypeId);
    expect(expanded.styleChordTreatment).toBe(profile.chordTreatment);
    expect(expanded.sections.map(({ label }) => label)).toEqual(["A", "B", "C", "D"]);
    expect(expanded.sections.every(({ chords }) => chords.length > 0)).toBe(true);
  });

  it("correlates Heavy, Alternative and Rock Ballad parameters", () => {
    let heavyMinor = 0;
    let heavyPower = 0;
    let alternativePower = 0;
    let balladTriads = 0;
    let balladCenterTempo = 0;
    const sampleSize = 600;
    for (let index = 0; index < sampleSize; index += 1) {
      const heavySeed = `heavy-${index}`;
      const heavy = resolveRockStyleProfile(heavySeed, "heavy");
      if (resolveRockMode(heavySeed, "heavy") === "minor") heavyMinor += 1;
      if (heavy.chordTreatment === "power") heavyPower += 1;

      const alternative = resolveRockStyleProfile(`alternative-${index}`, "alternative");
      if (alternative.chordTreatment === "power") alternativePower += 1;

      const balladSeed = `ballad-${index}`;
      const ballad = resolveRockStyleProfile(balladSeed, "rock-ballad");
      if (ballad.chordTreatment === "triads") balladTriads += 1;
      const bpm = generateSession({ seed: balladSeed, settings: settings("major"), styleProfile: ballad }).value.bpm;
      if (bpm >= 68 && bpm <= 90) balladCenterTempo += 1;
    }
    expect(heavyMinor / sampleSize).toBeGreaterThan(0.85);
    expect(heavyPower / sampleSize).toBeGreaterThan(0.78);
    expect(alternativePower / sampleSize).toBeGreaterThan(0.68);
    expect(balladTriads / sampleSize).toBeGreaterThan(0.55);
    expect(balladCenterTempo / sampleSize).toBeGreaterThan(0.72);
  });

  it("preserves characteristic root vocabularies without copying one fixed progression", () => {
    const families = [
      { id: "classic-modal", mode: "major" as const, roots: /bVII|IV/ },
      { id: "blues-rock", mode: "major" as const, roots: /bIII|IV/ },
      { id: "minor-rock", mode: "minor" as const, roots: /bVI|bVII|bIII/ },
    ];
    for (const family of families) {
      let characteristic = 0;
      const harmonies = new Set<string>();
      for (let index = 0; index < 160; index += 1) {
        const seed = `${family.id}-vocabulary-${index}`;
        const profile = resolveRockStyleProfile(seed, family.id, "triads");
        const session = generateSession({ seed, settings: settings(family.mode), styleProfile: profile }).value;
        const romans = session.sections.flatMap(({ chords }) => chords.map(({ roman }) => roman));
        if (romans.some((roman) => family.roots.test(roman))) characteristic += 1;
        harmonies.add(romans.join("|"));
      }
      expect(characteristic).toBeGreaterThan(95);
      expect(harmonies.size).toBeGreaterThan(8);
    }
  });

  it("keeps A identifiable, C simpler than B, and D more active than C", () => {
    let bEvents = 0;
    let cEvents = 0;
    let dEvents = 0;
    const sampleSize = 280;
    for (let index = 0; index < sampleSize; index += 1) {
      const seed = `rock-dramaturgy-${index}`;
      const profile = resolveRockStyleProfile(seed);
      const mode = resolveRockMode(seed, profile.archetypeId ?? "classic-modal");
      const original = generateSession({ seed, settings: settings(mode), styleProfile: profile }).value;
      const expanded = regenerateSessionSections({
        session: original,
        sectionLabels: ["C", "D"],
        sectionSettings: allSectionSettings(mode),
        seed: `${seed}-cd`,
        styleProfile: profile,
      }).value;
      const byLabel = Object.fromEntries(expanded.sections.map((section) => [section.label, section]));
      expect(byLabel.A.chords.length).toBeLessThanOrEqual(4);
      bEvents += byLabel.B.chords.length;
      cEvents += byLabel.C.chords.length;
      dEvents += byLabel.D.chords.length;
    }
    expect(cEvents).toBeLessThan(bEvents);
    expect(dEvents).toBeGreaterThan(cEvents);
  });

  it("keeps special colors rare and excludes normal jazz/funk extensions", () => {
    let special = 0;
    let total = 0;
    for (let index = 0; index < 500; index += 1) {
      const seed = `rock-special-colors-${index}`;
      const profile = resolveRockStyleProfile(seed);
      const mode = resolveRockMode(seed, profile.archetypeId ?? "classic-modal");
      const session = generateSession({ seed, settings: settings(mode, "advanced"), styleProfile: profile }).value;
      for (const chord of session.sections.flatMap(({ chords }) => chords)) {
        total += 1;
        if (/^(?:bII|bV|IV)(?:5|sus|add|7|$)/.test(chord.roman) && mode === "minor") special += 1;
        expect(chord.roman).not.toMatch(/(?<!add)(?:9|11|13)|#9|b9/);
      }
    }
    expect(special / total).toBeLessThan(0.1);
  });

  it("renders power chords and labels natural-minor III, VI and VII without false flats", () => {
    expect(renderRomanChord("I5", "A", "minor")).toBe("A5");
    expect(renderRomanChord("bIII5", "A", "minor")).toBe("C5");
    expect(formatRomanChord("bIII", "minor")).toBe("III");
    expect(formatRomanChord("bVI", "minor")).toBe("VI");
    expect(formatRomanChord("bVII", "minor")).toBe("VII");
    expect(formatRomanChord("bII", "minor")).toBe("♭II");
  });

  it("does not create half-bar Rock events in 3/4", () => {
    for (let index = 0; index < 120; index += 1) {
      const seed = `rock-three-four-${index}`;
      const profile = resolveRockStyleProfile(seed);
      const mode = resolveRockMode(seed, profile.archetypeId ?? "classic-modal");
      const threeFour = { ...settings(mode), meter: "3/4" as const };
      const session = generateSession({ seed, settings: threeFour, styleProfile: profile }).value;
      expect(session.sections.flatMap(({ chords }) => chords).every(({ durationBars }) => durationBars >= 1)).toBe(true);
    }
  });

  it("renders an explicit minor tonal center as a minor triad, not major", () => {
    for (const archetypeId of ["blues-rock", "alternative"] as const) {
      for (const complexity of ["easy", "medium", "advanced"] as const) {
        for (let index = 0; index < 160; index += 1) {
          const seed = `ROCK-minor-tonic-${archetypeId}-${complexity}-${index}`;
          const profile = resolveRockStyleProfile(seed, archetypeId, "triads");
          const minorSettings = {
            ...settings("minor", complexity),
            key: "E" as const,
          };
          const session = generateSession({ seed, settings: minorSettings, styleProfile: profile }).value;
          const tonicChords = session.sections
            .flatMap(({ chords }) => chords)
            .filter(({ harmonicFunction }) => harmonicFunction === "tonic");
          expect(tonicChords.some(({ roman }) => roman === "I")).toBe(false);
          expect(tonicChords.some(({ renderedSymbol }) => renderedSymbol === "E")).toBe(false);
        }
      }
    }
  });

  it("lets chord complexity override a power-oriented archetype", () => {
    let easyPowerChords = 0;
    let easyTotal = 0;
    let advancedPowerChords = 0;
    let advancedColoredChords = 0;
    let advancedTotal = 0;

    for (let index = 0; index < 300; index += 1) {
      const seed = `ROCK-heavy-complexity-${index}`;
      const profile = resolveRockStyleProfile(seed, "heavy", "power");
      const easySession = generateSession({
        seed: `${seed}-easy`,
        settings: settings("minor", "easy"),
        styleProfile: profile,
      }).value;
      const advancedSession = generateSession({
        seed: `${seed}-advanced`,
        settings: settings("minor", "advanced"),
        styleProfile: profile,
      }).value;

      for (const chord of easySession.sections.flatMap(({ chords }) => chords)) {
        easyTotal += 1;
        if (chord.roman.endsWith("5")) easyPowerChords += 1;
      }
      for (const chord of advancedSession.sections.flatMap(({ chords }) => chords)) {
        advancedTotal += 1;
        if (chord.roman.endsWith("5")) advancedPowerChords += 1;
        if (/(?:sus2|sus4|add9|7)$/.test(chord.roman)) {
          advancedColoredChords += 1;
        }
      }
    }

    expect(easyPowerChords / easyTotal).toBeGreaterThan(0.75);
    expect(advancedPowerChords / advancedTotal).toBeLessThan(0.3);
    expect(advancedColoredChords / advancedTotal).toBeGreaterThan(0.3);
  });
});
