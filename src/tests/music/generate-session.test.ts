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
            expect(sectionB.role === "chorus" || sectionB.role === "bridge").toBe(
              true,
            );
            expect(bHarmony).not.toBe(aHarmony);

            if (sectionB.role === "chorus") {
              expect(
                sectionB.chords.at(-1)?.harmonicFunction,
                `seed development-${complexity}-${harmonicFreedom}-${mode}-${seed}`,
              ).toBe("tonic");
            } else {
              expect(sectionB.chords.at(-1)?.harmonicFunction).toBe("dominant");
            }
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

  it("changes only session timing when tempo settings are applied", () => {
    const original = generateSession({
      seed: "retime-existing-card",
      settings: settings("advanced", "colorful", "minor"),
      styleProfile: funkStyleProfile,
    }).value;
    const originalHarmony = original.sections.map((section) => section.chords);
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
    expect(retimed.sections.map((section) => section.chords)).toEqual(
      originalHarmony,
    );
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
      },
      seed: "focus-next",
      styleProfile: funkStyleProfile,
    }).value;

    expect(next.sections[0]?.harmonySettings.key).toBe("F#");
    expect(next.sections[1]).toEqual(originalB);
    expect(next.timeline[1]?.sectionId).toBe(originalB?.id);
  });
});
