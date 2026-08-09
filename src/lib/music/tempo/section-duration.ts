import type {
  Meter,
  SectionDurationMode,
  SectionLabel,
  SessionTimingSettings,
} from "../domain/types";
import { createSeededRandom, deriveSeed } from "../random";

export const RANDOM_SQUARE_RANGES: Record<
  SectionLabel,
  { min: number; max: number }
> = {
  A: { min: 16, max: 24 },
  B: { min: 8, max: 16 },
};

export function sectionDurationMode(
  timing: SessionTimingSettings,
  label: SectionLabel,
): SectionDurationMode {
  return (
    (label === "A"
      ? timing.sectionADurationMode
      : timing.sectionBDurationMode) ?? "seconds"
  );
}

export function squareDurationSeconds(
  bars: number,
  bpm: number,
  meter: Meter,
): number {
  const beatsPerBar = Number.parseInt(meter.split("/")[0] ?? "4", 10);
  return bars * beatsPerBar * (60 / bpm);
}

export function durationSecondsFromSquares(
  squares: number,
  bars: number,
  bpm: number,
  meter: Meter,
): number {
  return Math.max(
    1,
    Math.round(squares * squareDurationSeconds(bars, bpm, meter)),
  );
}

export function resolveSectionDurationSeconds({
  timing,
  label,
  bars,
  bpm,
  meter,
  seed,
}: {
  timing: SessionTimingSettings;
  label: SectionLabel;
  bars: number;
  bpm: number;
  meter: Meter;
  seed: string;
}): number {
  const seconds =
    label === "A"
      ? timing.sectionADurationSeconds
      : timing.sectionBDurationSeconds;
  const mode = sectionDurationMode(timing, label);

  if (mode === "seconds") return seconds;

  let squares =
    label === "A" ? timing.sectionASquares : timing.sectionBSquares;

  if (mode === "random") {
    const range = RANDOM_SQUARE_RANGES[label];
    const random = createSeededRandom(
      deriveSeed(seed, `timing:${label}:squares`),
    );
    squares =
      range.min + Math.floor(random.next() * (range.max - range.min + 1));
  }

  return durationSecondsFromSquares(
    Math.max(1, squares ?? RANDOM_SQUARE_RANGES[label].min),
    bars,
    bpm,
    meter,
  );
}
