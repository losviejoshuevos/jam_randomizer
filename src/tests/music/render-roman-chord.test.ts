import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";
import type { Mode, PitchClass } from "@/lib/music/domain/types";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";

describe("renderRomanChord", () => {
  it.each([
    ["i7", "C", "minor", "Cm7"],
    ["iv7", "C", "minor", "Fm7"],
    ["V7", "C", "minor", "G7"],
    ["bVII7", "C", "major", "Bb7"],
    ["V7/V", "C", "major", "D7"],
    ["V13/V", "C", "major", "D13"],
    ["Imaj9", "C", "major", "Cmaj9"],
    ["i11", "C", "minor", "Cm11"],
    ["V7#9", "C", "major", "G7#9"],
    ["bVII7", "F", "major", "Eb7"],
  ] as const)("renders %s in %s %s as %s", (roman, key, mode, expected) => {
    expect(renderRomanChord(roman, key, mode)).toBe(expected);
  });

  it("renders every Funk vocabulary entry in every allowed key", () => {
    const keys: PitchClass[] = [
      "C",
      "C#",
      "D",
      "Eb",
      "E",
      "F",
      "F#",
      "G",
      "Ab",
      "A",
      "Bb",
      "B",
    ];

    for (const definition of funkStyleProfile.chordVocabulary) {
      for (const mode of definition.allowedModes as Mode[]) {
        for (const key of keys) {
          expect(renderRomanChord(definition.roman, key, mode)).not.toBe("");
        }
      }
    }
  });

  it("rejects unsupported notation instead of returning a broken symbol", () => {
    expect(() => renderRomanChord("DD7", "C", "major")).toThrow(
      "Unsupported RomanChord",
    );
  });
});
