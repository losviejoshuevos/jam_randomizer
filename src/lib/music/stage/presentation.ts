import type { JamChord, Meter } from "../domain/types";

export function formatStageDuration(durationBars: number): string {
  if (durationBars === 0.5) return "x½";
  return `x${durationBars}`;
}

export function beatsPerBar(meter: Meter): number {
  return Number.parseInt(meter.split("/")[0] ?? "4", 10);
}

export function nextBeatIndex(currentBeat: number, meter: Meter): number {
  return (currentBeat + 1) % beatsPerBar(meter);
}

export function barDurationMilliseconds(bpm: number, meter: Meter): number {
  return (60_000 / bpm) * beatsPerBar(meter);
}

export function chordIdAtBeat(
  chords: readonly JamChord[],
  beatWithinSquare: number,
  meter: Meter,
  sectionBars: number,
): string | null {
  const beatCount = beatsPerBar(meter);
  const totalBeats = Math.max(1, sectionBars * beatCount);
  const normalizedBeat =
    ((beatWithinSquare % totalBeats) + totalBeats) % totalBeats;
  const positionBars = normalizedBeat / beatCount;

  return (
    chords.find(
      ({ startBar, durationBars }) =>
        positionBars >= startBar && positionBars < startBar + durationBars,
    )?.id ?? null
  );
}
