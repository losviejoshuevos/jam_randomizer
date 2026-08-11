import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type { GenerationSettings } from "@/lib/music/domain/types";
import {
  generateSession,
  transposeSessionSections,
} from "@/lib/music/generator";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";

const settings: GenerationSettings = {
  styleId: "funk",
  key: "C",
  mode: "minor",
  bpm: 100,
  meter: "4/4",
  complexity: "medium",
  harmonicFreedom: "colorful",
  timing: {
    sectionADurationSeconds: 150,
    sectionBDurationSeconds: 90,
    transitionWarningSeconds: 10,
  },
};

describe("transposeSessionSections", () => {
  it("transposes only selected themes while preserving their harmony", () => {
    const session = generateSession({
      seed: "transpose-selected",
      settings,
      styleProfile: funkStyleProfile,
    }).value;
    const [sectionA, sectionB] = session.sections;
    const transposed = transposeSessionSections(session, ["B"], { B: "D" });
    const nextA = transposed.sections.find(({ label }) => label === "A");
    const nextB = transposed.sections.find(({ label }) => label === "B");

    expect(nextA).toBe(sectionA);
    expect(nextB?.harmonySettings).toEqual({
      ...sectionB?.harmonySettings,
      key: "D",
    });
    expect(nextB?.chords.map(({ id, roman, startBar, durationBars }) => ({
      id,
      roman,
      startBar,
      durationBars,
    }))).toEqual(
      sectionB?.chords.map(({ id, roman, startBar, durationBars }) => ({
        id,
        roman,
        startBar,
        durationBars,
      })),
    );
    expect(nextB?.chords.map(({ renderedSymbol }) => renderedSymbol)).toEqual(
      nextB?.chords.map(({ roman }) => renderRomanChord(roman, "D", "minor")),
    );
  });

  it("updates session metadata when theme A is transposed", () => {
    const session = generateSession({
      seed: "transpose-theme-a",
      settings,
      styleProfile: funkStyleProfile,
    }).value;
    const transposed = transposeSessionSections(session, ["A"], { A: "F#" });

    expect(transposed.key).toBe("F#");
    expect(transposed.mode).toBe("minor");
    expect(transposed.title).toBe("Funk F# minor");
    expect(transposed.timeline).toEqual(session.timeline);
  });
});
