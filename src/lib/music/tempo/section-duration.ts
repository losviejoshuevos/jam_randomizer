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
  C: { min: 8, max: 16 },
  D: { min: 8, max: 16 },
};

export function sectionDurationSettings(
  timing: SessionTimingSettings,
  label: SectionLabel,
): { mode: SectionDurationMode; seconds: number; squares: number } {
  const configured = timing.sectionDurations?.[label];
  if (configured) return configured;

  if (label === "A") {
    return {
      mode: timing.sectionADurationMode ?? "seconds",
      seconds: timing.sectionADurationSeconds,
      squares: timing.sectionASquares ?? RANDOM_SQUARE_RANGES.A.min,
    };
  }

  if (label === "B") {
    return {
      mode: timing.sectionBDurationMode ?? "seconds",
      seconds: timing.sectionBDurationSeconds,
      squares: timing.sectionBSquares ?? RANDOM_SQUARE_RANGES.B.min,
    };
  }

  return {
    mode: "random",
    seconds: label === "C" ? 90 : 60,
    squares: RANDOM_SQUARE_RANGES[label].min,
  };
}

export function sectionDurationMode(
  timing: SessionTimingSettings,
  label: SectionLabel,
): SectionDurationMode {
  return sectionDurationSettings(timing, label).mode;
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
  const durationSettings = sectionDurationSettings(timing, label);
  const seconds = durationSettings.seconds;
  const mode = sectionDurationMode(timing, label);

  if (mode === "seconds") return seconds;

  let squares = durationSettings.squares;

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
