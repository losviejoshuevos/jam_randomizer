import { describe, expect, it } from "vitest";
import {
  barDurationMilliseconds,
  beatsPerBar,
  chordIdAtBeat,
  formatStageDuration,
  nextBeatIndex,
  nextSquareBeatIndex,
  shouldShowNextSectionPreview,
  synchronizedBeatPosition,
  synchronizedRemainingSeconds,
} from "@/lib/music/stage/presentation";

describe("Stage presentation", () => {
  it("formats bar counts for distant stage reading", () => {
    expect(formatStageDuration(0.5)).toBe("x½");
    expect(formatStageDuration(1)).toBe("x1");
    expect(formatStageDuration(2)).toBe("x2");
    expect(formatStageDuration(4)).toBe("x4");
  });

  it("calculates one visual handoff bar from BPM and meter", () => {
    expect(beatsPerBar("4/4")).toBe(4);
    expect(beatsPerBar("3/4")).toBe(3);
    expect(barDurationMilliseconds(120, "4/4")).toBe(2_000);
    expect(barDurationMilliseconds(120, "3/4")).toBe(1_500);
  });

  it("loops the metronome after three beats in 3/4", () => {
    expect(nextBeatIndex(0, "3/4")).toBe(1);
    expect(nextBeatIndex(1, "3/4")).toBe(2);
    expect(nextBeatIndex(2, "3/4")).toBe(0);
    expect(nextBeatIndex(3, "4/4")).toBe(0);
  });

  it("reaches a transition boundary only after the complete square", () => {
    expect(nextSquareBeatIndex(2, "4/4", 4)).toBe(3);
    expect(nextSquareBeatIndex(3, "4/4", 4)).toBe(4);
    expect(nextSquareBeatIndex(15, "4/4", 4)).toBe(0);
    expect(nextSquareBeatIndex(11, "3/4", 4)).toBe(0);
  });

  it("maps metronome beats to whole and half-bar chords", () => {
    const chords = [
      {
        id: "first-half",
        source: "generated" as const,
        roman: "i7",
        renderedSymbol: "Am7",
        harmonicFunction: "tonic" as const,
        startBar: 0,
        durationBars: 0.5,
      },
      {
        id: "second-half",
        source: "generated" as const,
        roman: "iv7",
        renderedSymbol: "Dm7",
        harmonicFunction: "predominant" as const,
        startBar: 0.5,
        durationBars: 0.5,
      },
      {
        id: "second-bar",
        source: "generated" as const,
        roman: "V7",
        renderedSymbol: "E7",
        harmonicFunction: "dominant" as const,
        startBar: 1,
        durationBars: 1,
      },
    ];

    expect(chordIdAtBeat(chords, 0, "4/4", 2)).toBe("first-half");
    expect(chordIdAtBeat(chords, 1, "4/4", 2)).toBe("first-half");
    expect(chordIdAtBeat(chords, 2, "4/4", 2)).toBe("second-half");
    expect(chordIdAtBeat(chords, 4, "4/4", 2)).toBe("second-bar");
    expect(chordIdAtBeat(chords, 8, "4/4", 2)).toBe("first-half");
  });

  it("restores the current beat after a delayed room event", () => {
    expect(synchronizedBeatPosition({
      serverNowMs: 2_250,
      anchorAtMs: 1_000,
      beatMilliseconds: 500,
      anchorBeatIndex: 0,
      anchorSquareBeat: 0,
      meter: "4/4",
      squareBeats: 16,
    })).toEqual({
      beatIndex: 2,
      squareBeat: 2,
      millisecondsUntilNextBeat: 250,
    });
  });

  it("anchors a guest timer to the scheduled start instead of the update time", () => {
    expect(synchronizedRemainingSeconds({
      remainingAtAnchor: 70,
      anchorAtMs: Date.parse("2026-08-23T15:01:19.355Z"),
      serverNowMs: Date.parse("2026-08-23T15:01:45.536Z"),
    })).toBeCloseTo(43.819, 3);
    expect(synchronizedRemainingSeconds({
      remainingAtAnchor: 70,
      anchorAtMs: 2_000,
      serverNowMs: 1_500,
    })).toBe(70);
  });

  it("shows the next section immediately after a manual transition is queued", () => {
    expect(shouldShowNextSectionPreview({
      running: true,
      hasNextSection: true,
      transitionQueued: true,
      remainingSeconds: 90,
      warningSeconds: 10,
    })).toBe(true);
    expect(shouldShowNextSectionPreview({
      running: true,
      hasNextSection: true,
      transitionQueued: false,
      remainingSeconds: 90,
      warningSeconds: 10,
    })).toBe(false);
  });
});
