import { describe, expect, it } from "vitest";
import type { SessionTimingSettings } from "@/lib/music/domain/types";
import {
  durationSecondsFromSquares,
  resolveSectionDurationSeconds,
  squareDurationSeconds,
} from "@/lib/music/tempo/section-duration";

const timing: SessionTimingSettings = {
  sectionADurationSeconds: 150,
  sectionBDurationSeconds: 90,
  sectionADurationMode: "random",
  sectionBDurationMode: "random",
  sectionASquares: 20,
  sectionBSquares: 12,
  transitionWarningSeconds: 10,
};

describe("section duration", () => {
  it("calculates duration from the actual square, tempo and meter", () => {
    expect(squareDurationSeconds(4, 100, "4/4")).toBeCloseTo(9.6);
    expect(durationSecondsFromSquares(16, 4, 100, "4/4")).toBe(154);
    expect(durationSecondsFromSquares(8, 4, 100, "4/4")).toBe(77);
  });

  it("keeps random A-D durations inside their product ranges", () => {
    for (let index = 0; index < 100; index += 1) {
      const common = {
        timing,
        bars: 4,
        bpm: 100,
        meter: "4/4" as const,
        seed: `duration-${index}`,
      };
      const durationA = resolveSectionDurationSeconds({
        ...common,
        label: "A",
      });
      const durationB = resolveSectionDurationSeconds({
        ...common,
        label: "B",
      });
      const durationC = resolveSectionDurationSeconds({ ...common, label: "C" });
      const durationD = resolveSectionDurationSeconds({ ...common, label: "D" });

      expect(durationA).toBeGreaterThanOrEqual(154);
      expect(durationA).toBeLessThanOrEqual(230);
      expect(durationB).toBeGreaterThanOrEqual(77);
      expect(durationB).toBeLessThanOrEqual(154);
      expect(durationC).toBeGreaterThanOrEqual(77);
      expect(durationC).toBeLessThanOrEqual(154);
      expect(durationD).toBeGreaterThanOrEqual(77);
      expect(durationD).toBeLessThanOrEqual(154);
    }
  });

  it("supports manual seconds and manual squares", () => {
    expect(
      resolveSectionDurationSeconds({
        timing: { ...timing, sectionADurationMode: "seconds" },
        label: "A",
        bars: 4,
        bpm: 100,
        meter: "4/4",
        seed: "manual-seconds",
      }),
    ).toBe(150);
    expect(
      resolveSectionDurationSeconds({
        timing: { ...timing, sectionADurationMode: "squares" },
        label: "A",
        bars: 4,
        bpm: 100,
        meter: "4/4",
        seed: "manual-squares",
      }),
    ).toBe(192);
  });
});
