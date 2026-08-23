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

export function nextSquareBeatIndex(
  currentBeat: number,
  meter: Meter,
  sectionBars: number,
): number {
  const squareBeats = Math.max(1, sectionBars * beatsPerBar(meter));
  return (currentBeat + 1) % squareBeats;
}

export function barDurationMilliseconds(bpm: number, meter: Meter): number {
  return (60_000 / bpm) * beatsPerBar(meter);
}

export function synchronizedBeatPosition(options: {
  serverNowMs: number;
  anchorAtMs: number;
  beatMilliseconds: number;
  anchorBeatIndex: number;
  anchorSquareBeat: number;
  meter: Meter;
  squareBeats: number;
}) {
  const elapsed = Math.max(0, options.serverNowMs - options.anchorAtMs);
  const elapsedBeats = Math.floor(elapsed / options.beatMilliseconds);
  return {
    beatIndex:
      (options.anchorBeatIndex + elapsedBeats) % beatsPerBar(options.meter),
    squareBeat:
      (options.anchorSquareBeat + elapsedBeats) % Math.max(1, options.squareBeats),
    millisecondsUntilNextBeat: Math.max(
      16,
      options.beatMilliseconds - (elapsed % options.beatMilliseconds),
    ),
  };
}

export function synchronizedRemainingSeconds(options: {
  remainingAtAnchor: number;
  anchorAtMs: number;
  serverNowMs: number;
}): number {
  const elapsedSeconds = Math.max(
    0,
    (options.serverNowMs - options.anchorAtMs) / 1_000,
  );
  return Math.max(0, options.remainingAtAnchor - elapsedSeconds);
}

export function shouldShowNextSectionPreview(options: {
  running: boolean;
  hasNextSection: boolean;
  transitionQueued: boolean;
  remainingSeconds: number;
  warningSeconds: number;
}): boolean {
  return (
    options.running &&
    options.hasNextSection &&
    (options.transitionQueued ||
      options.remainingSeconds <= options.warningSeconds)
  );
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
