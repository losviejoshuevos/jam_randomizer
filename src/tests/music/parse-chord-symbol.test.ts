import { describe, expect, it } from "vitest";
import { parseChordSymbol } from "@/lib/music/rendering/parse-chord-symbol";
import { renderRomanChord } from "@/lib/music/rendering/render-roman-chord";

describe("parseChordSymbol", () => {
  it.each([
    ["Dm7", "C", "major", "ii7", "Dm7", "predominant"],
    ["Abmaj7", "C", "major", "bVImaj7", "Abmaj7", "color"],
    ["D7", "C", "major", "II7", "D7", "dominant"],
    ["C#m7b5", "C", "major", "#i7b5", "C#m7b5", "color"],
    ["Bb13sus4", "C", "major", "bVII13sus4", "Bb13sus4", "color"],
    ["C/E", "C", "major", "I/@III", "C/E", "tonic"],
    ["C", "A", "minor", "bIII", "C", "tonic"],
  ] as const)(
    "parses %s in %s %s",
    (symbol, key, mode, roman, renderedSymbol, harmonicFunction) => {
      expect(parseChordSymbol(symbol, key, mode)).toEqual({
        roman,
        renderedSymbol,
        harmonicFunction,
      });
    },
  );

  it.each([
    ["F♯m9", "F#m9"],
    ["Cø7", "Cm7b5"],
    ["D°7", "Ddim7"],
    ["E+", "Eaug"],
    ["Gsus", "Gsus4"],
    ["A7(♭9)", "A7b9"],
  ] as const)("normalizes jazz alias %s", (input, expected) => {
    expect(parseChordSymbol(input, "C", "major")?.renderedSymbol).toBe(expected);
  });

  it("keeps a manual slash chord transposable", () => {
    const parsed = parseChordSymbol("C/E", "C", "major");
    expect(parsed).not.toBeNull();
    expect(renderRomanChord(parsed?.roman ?? "", "D", "major")).toBe("D/F#");
  });

  it.each(["", "H7", "Cbanana", "C7/9", "C//E"])(
    "rejects unsupported input %s",
    (input) => {
      expect(parseChordSymbol(input, "C", "major")).toBeNull();
    },
  );
});
