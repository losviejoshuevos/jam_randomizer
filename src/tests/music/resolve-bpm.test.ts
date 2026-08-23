import { describe, expect, it } from "vitest";
import {
  MAX_MANUAL_BPM,
  MIN_MANUAL_BPM,
  resolveBpm,
  resolveDifferentRandomBpm,
} from "@/lib/music/tempo/resolve-bpm";

describe("resolveBpm", () => {
  const funkRange = { min: 88, max: 118 };

  it("reproduces a random BPM from the card seed", () => {
    expect(resolveBpm("random", funkRange, "FUNK-ABCDE-23456")).toBe(
      resolveBpm("random", funkRange, "FUNK-ABCDE-23456"),
    );
  });

  it("keeps random Funk BPM inside the inclusive style range", () => {
    for (let seed = 0; seed < 1_000; seed += 1) {
      const bpm = resolveBpm("random", funkRange, `tempo-${seed}`);

      expect(bpm).toBeGreaterThanOrEqual(funkRange.min);
      expect(bpm).toBeLessThanOrEqual(funkRange.max);
      expect(Number.isInteger(bpm)).toBe(true);
    }
  });

  it("preserves a valid manually selected BPM", () => {
    expect(resolveBpm(127, funkRange, "manual-tempo")).toBe(127);
  });

  it("changes a random BPM even when the seeded draw repeats it", () => {
    const drawn = resolveBpm("random", funkRange, "repeat-random-tempo");

    expect(
      resolveDifferentRandomBpm(drawn, funkRange, "repeat-random-tempo"),
    ).not.toBe(drawn);
  });

  it.each([MIN_MANUAL_BPM - 1, MAX_MANUAL_BPM + 1, 100.5])(
    "rejects invalid manual BPM %s",
    (bpm) => {
      expect(() => resolveBpm(bpm, funkRange, "invalid-tempo")).toThrow(
        "Manual BPM",
      );
    },
  );
});
