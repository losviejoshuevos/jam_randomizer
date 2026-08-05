import type { Meter } from "../domain/types";

export function beatsPerBar(meter: Meter): number {
  return meter === "3/4" ? 3 : 4;
}

export function calculateTransitionWarningSeconds(
  squareBars: number,
  bpm: number,
  meter: Meter,
): number {
  if (!Number.isFinite(squareBars) || squareBars <= 0) {
    throw new Error("Square bars must be a positive number.");
  }

  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error("BPM must be a positive number.");
  }

  const barSeconds = (60 / bpm) * beatsPerBar(meter);

  return Math.ceil((squareBars + 1) * barSeconds);
}
