import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFreedom,
  Mode,
} from "@/lib/music/domain/types";
import {
  generateSession,
  regenerateSessionSections,
  retimeSession,
  sessionForm,
  setSessionForm,
} from "@/lib/music/generator";
import { validateGeneratedSection } from "@/lib/music/validation/validate-section";

function settings(
  complexity: Complexity,
  harmonicFreedom: HarmonicFreedom,
  mode: Mode,
): GenerationSettings {
  return {
    styleId: "funk",
    key: "C",
    mode,
    bpm: 120,
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

describe("generateSession", () => {
  function generatedSpiceCount(
    session: ReturnType<typeof generateSession>["value"],
  ): number {
    return session.sections.reduce((sectionTotal, section) => {
      const spiceRomans = new Set(
        funkStyleProfile.chordVocabulary
          .filter(
            (definition) =>
              definition.harmonicPool !== "core" &&
              definition.allowedModes.includes(section.harmonySettings.mode) &&
              definition.allowedComplexities?.includes(
                section.harmonySettings.complexity,
              ),
          )
          .map(({ roman }) => roman),
      );
      return (
        sectionTotal +
        section.chords.filter(
          ({ source, roman }) => source === "generated" && spiceRomans.has(roman),
        ).length
      );
    }, 0);
  }

  it("builds the A → B → A timeline with BPM-based warnings", () => {
    const generationSettings = settings("medium", "colorful", "minor");
    const result = generateSession({
      seed: "complete-session",
      settings: generationSettings,
      styleProfile: funkStyleProfile,
    });
    const [sectionA, sectionB] = result.value.sections;

    expect(result.value.timeline.map(({ sectionId }) => sectionId)).toEqual([
      sectionA.id,
      sectionB.id,
      sectionA.id,
    ]);
    expect(result.value.timeline.map(({ durationSeconds }) => durationSeconds)).toEqual([
      150,
      90,
      150,
    ]);
    expect(
      result.value.timeline.every(
        ({ transitionWarningSeconds }) => transitionWarningSeconds >= 10,
      ),
    ).toBe(true);
  });

  it("generates B as a contrasting development of A", () => {
    for (const complexity of ["easy", "medium", "advanced"] as const) {
      for (const harmonicFreedom of [
        "strict",
        "colorful",
        "adventurous",
      ] as const) {
        for (const mode of ["major", "minor"] as const) {
          const generationSettings = settings(
            complexity,
            harmonicFreedom,
            mode,
          );

          for (let seed = 0; seed < 100; seed += 1) {
            const result = generateSession({
              seed: `development-${complexity}-${harmonicFreedom}-${mode}-${seed}`,
              settings: generationSettings,
              styleProfile: funkStyleProfile,
            });
            const [sectionA, sectionB] = result.value.sections;
            const aHarmony = sectionA.chords.map(({ roman }) => roman).join("|");
            const bHarmony = sectionB.chords.map(({ roman }) => roman).join("|");
            const validation = validateGeneratedSection(
              sectionB,
              "B",
              funkStyleProfile,
              generationSettings,
            );

            expect(
              result.usedFallback,
              `seed development-${complexity}-${harmonicFreedom}-${mode}-${seed}`,
            ).toBe(false);
            expect(validation).toEqual({ valid: true, issues: [] });
            expect(sectionB.role).toBe("development");
            expect(bHarmony).not.toBe(aHarmony);
            expect(["tonic", "dominant", "predominant", "color"]).toContain(
              sectionB.chords.at(-1)?.harmonicFunction,
            );
          }
        }
      }
    }
  });

  it("starts theme B on the root tonic about 40% of the time", () => {
    let tonicStarts = 0;
    const sampleSize = 1_000;

    for (let seed = 0; seed < sampleSize; seed += 1) {
      const session = generateSession({
        seed: `theme-b-start-${seed}`,
        settings: settings("medium", "colorful", "minor"),
        styleProfile: funkStyleProfile,
      }).value;
      const firstRoman = session.sections[1]?.chords[0]?.roman;
      if (firstRoman && /^i(?:\d|$)/.test(firstRoman)) tonicStarts += 1;
    }

    expect(tonicStarts / sampleSize).toBeGreaterThan(0.35);
    expect(tonicStarts / sampleSize).toBeLessThan(0.45);
  });

  it("uses no more than one non-core harmony spice per generated session", () => {
    for (let seed = 0; seed < 1_000; seed += 1) {
      const session = generateSession({
        seed: `single-spice-${seed}`,
        settings: settings("advanced", "adventurous", "major"),
        styleProfile: funkStyleProfile,
      }).value;

      expect(generatedSpiceCount(session), `seed single-spice-${seed}`).toBeLessThanOrEqual(1);
    }
  });

  it("changes only session timing when tempo settings are applied", () => {
    const original = generateSession({
      seed: "retime-existing-card",
      settings: settings("advanced", "colorful", "minor"),
      styleProfile: funkStyleProfile,
    }).value;
    const originalHarmony = original.sections.map((section) =>
      section.chords.map(({ id, roman, renderedSymbol }) => ({
        id,
        roman,
        renderedSymbol,
      })),
    );
    const nextSettings = {
      ...settings("advanced", "colorful", "minor"),
      bpm: 60,
      meter: "3/4" as const,
      timing: {
        sectionADurationSeconds: 210,
        sectionBDurationSeconds: 75,
        transitionWarningSeconds: 10,
      },
    } satisfies GenerationSettings;

    const retimed = retimeSession(original, nextSettings, funkStyleProfile);

    expect(retimed.id).toBe(original.id);
    expect(
      retimed.sections.map((section) =>
        section.chords.map(({ id, roman, renderedSymbol }) => ({
          id,
          roman,
          renderedSymbol,
        })),
      ),
    ).toEqual(originalHarmony);
    expect(retimed.bpm).toBe(60);
    expect(retimed.meter).toBe("3/4");
    expect(retimed.timeline.map((step) => step.durationSeconds)).toEqual([
      210,
      75,
      210,
    ]);
    expect(retimed.timeline[0]?.transitionWarningSeconds).not.toBe(
      original.timeline[0]?.transitionWarningSeconds,
    );
  });

  it("promotes half-bar chords to whole bars when switching to 3/4", () => {
    const original = generateSession({
      seed: "normalize-halves-for-three-four",
      settings: settings("advanced", "colorful", "minor"),
      styleProfile: funkStyleProfile,
    }).value;
    const sectionA = original.sections[0]!;
    const sourceChord = sectionA.chords[0]!;
    const sessionWithHalves = {
      ...original,
      sections: original.sections.map((section) =>
        section.label === "A"
          ? {
              ...section,
              chords: [
                {
                  ...sourceChord,
                  id: "manual-half-1",
                  startBar: 0,
                  durationBars: 0.5,
                },
                {
                  ...sourceChord,
                  id: "manual-half-2",
                  startBar: 0.5,
                  durationBars: 0.5,
                },
                ...section.chords.slice(1),
              ],
            }
          : section,
      ),
    };
    const retimed = retimeSession(
      sessionWithHalves,
      {
        ...settings("advanced", "colorful", "minor"),
        meter: "3/4",
      },
      funkStyleProfile,
    );
    const normalizedA = retimed.sections.find(({ label }) => label === "A")!;

    expect(normalizedA.chords.some(({ durationBars }) => durationBars === 0.5)).toBe(
      false,
    );
    expect(normalizedA.chords[0]).toMatchObject({
      id: "manual-half-1",
      startBar: 0,
      durationBars: 1,
    });
    expect(normalizedA.chords[1]).toMatchObject({
      id: "manual-half-2",
      startBar: 1,
      durationBars: 1,
    });
  });

  it("stores independent harmony settings for A and B", () => {
    const base = settings("easy", "strict", "minor");
    const result = generateSession({
      seed: "independent-section-settings",
      settings: base,
      sectionSettings: {
        A: {
          key: "A",
          mode: "minor",
          complexity: "medium",
          harmonicFreedom: "strict",
        },
        B: {
          key: "D",
          mode: "major",
          complexity: "easy",
          harmonicFreedom: "adventurous",
        },
      },
      styleProfile: funkStyleProfile,
    });

    expect(result.value.sections[0]?.harmonySettings).toMatchObject({
      key: "A",
      mode: "minor",
      complexity: "medium",
      harmonicFreedom: "strict",
    });
    expect(result.value.sections[1]?.harmonySettings).toMatchObject({
      key: "D",
      mode: "major",
      complexity: "easy",
      harmonicFreedom: "adventurous",
    });
  });

  it("regenerates only focused themes and preserves the others", () => {
    const original = generateSession({
      seed: "focus-original",
      settings: settings("easy", "strict", "minor"),
      styleProfile: funkStyleProfile,
    }).value;
    const originalB = original.sections[1];
    const next = regenerateSessionSections({
      session: original,
      sectionLabels: ["A"],
      sectionSettings: {
        A: {
          key: "F#",
          mode: "major",
          complexity: "advanced",
          harmonicFreedom: "adventurous",
        },
        B: originalB!.harmonySettings,
        C: originalB!.harmonySettings,
        D: originalB!.harmonySettings,
      },
      seed: "focus-next",
      styleProfile: funkStyleProfile,
    }).value;

    expect(next.sections[0]?.harmonySettings.key).toBe("F#");
    expect(next.sections[1]).toEqual(originalB);
    expect(next.timeline[1]?.sectionId).toBe(originalB?.id);
  });

  it("creates C and D as independent bridge and coda themes", () => {
    const generationSettings = settings("medium", "colorful", "minor");
    const original = generateSession({
      seed: "multi-theme-original",
      settings: generationSettings,
      styleProfile: funkStyleProfile,
    }).value;
    const common = original.sections[0]!.harmonySettings;
    const expanded = regenerateSessionSections({
      session: original,
      sectionLabels: ["C", "D"],
      sectionSettings: { A: common, B: common, C: common, D: common },
      seed: "multi-theme-expanded",
      styleProfile: funkStyleProfile,
    }).value;

    expect(expanded.sections.map(({ label }) => label)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(expanded.sections.find(({ label }) => label === "C")?.role).toBe(
      "bridge",
    );
    expect(expanded.sections.find(({ label }) => label === "D")?.role).toBe(
      "coda",
    );
  });

  it("uses the timeline as the single source of truth for a custom form", () => {
    const generationSettings = settings("easy", "strict", "major");
    const original = generateSession({
      seed: "custom-form-original",
      settings: generationSettings,
      styleProfile: funkStyleProfile,
    }).value;
    const common = original.sections[0]!.harmonySettings;
    const expanded = regenerateSessionSections({
      session: original,
      sectionLabels: ["C", "D"],
      sectionSettings: { A: common, B: common, C: common, D: common },
      seed: "custom-form-expanded",
      styleProfile: funkStyleProfile,
    }).value;
    const formed = setSessionForm(expanded, ["A", "C", "B", "D", "A"]);

    expect(sessionForm(formed)).toEqual(["A", "C", "B", "D", "A"]);
    expect(formed).not.toHaveProperty("form");
  });

  it("removes theme entities that are not used by the selected form", () => {
    const generationSettings = settings("easy", "strict", "major");
    const original = generateSession({
      seed: "single-theme-form",
      settings: generationSettings,
      styleProfile: funkStyleProfile,
    }).value;

    const formed = setSessionForm(original, ["A"]);

    expect(sessionForm(formed)).toEqual(["A"]);
    expect(formed.sections.map(({ label }) => label)).toEqual(["A"]);
  });
});
