import { describe, expect, it } from "vitest";
import { formatChordDuration } from "@/lib/music/rendering/format-chord-duration";

describe("formatChordDuration", () => {
  it.each([
    [0.5, "½ такта"],
    [1, "1 такт"],
    [1.5, "1½ такта"],
    [2, "2 такта"],
    [4, "4 такта"],
    [5, "5 тактов"],
  ])("formats %s bars as %s", (duration, expected) => {
    expect(formatChordDuration(duration)).toBe(expected);
  });
});
