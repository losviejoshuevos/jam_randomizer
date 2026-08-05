import { describe, expect, it } from "vitest";
import type { JamChord } from "@/lib/music/domain/types";
import { groupChordsForDisplay } from "@/lib/music/rendering/group-chords-for-display";

function chord(id: string, durationBars: number): JamChord {
  return {
    id,
    source: "generated",
    roman: "I7",
    renderedSymbol: "C7",
    harmonicFunction: "tonic",
    startBar: 0,
    durationBars,
  };
}

describe("groupChordsForDisplay", () => {
  it("combines two adjacent half-bar chords into one visual bar", () => {
    const groups = groupChordsForDisplay([
      chord("half-a", 0.5),
      chord("half-b", 0.5),
      chord("full", 1),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      startIndex: 0,
      durationBars: 1,
    });
    expect(groups[0]?.chords.map(({ id }) => id)).toEqual([
      "half-a",
      "half-b",
    ]);
    expect(groups[1]?.chords.map(({ id }) => id)).toEqual(["full"]);
  });

  it("creates a separate frame for each pair of half-bars", () => {
    const groups = groupChordsForDisplay([
      chord("a", 0.5),
      chord("b", 0.5),
      chord("c", 0.5),
      chord("d", 0.5),
    ]);

    expect(groups.map(({ chords }) => chords.map(({ id }) => id))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("does not combine ordinary chord durations", () => {
    const groups = groupChordsForDisplay([
      chord("one", 1),
      chord("two", 2),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.every(({ chords }) => chords.length === 1)).toBe(true);
  });
});
