import type { GenerationSettings, Seed } from "../domain/types";
import { createSeededRandom, deriveSeed } from "../random";

export const MIN_MANUAL_BPM = 40;
export const MAX_MANUAL_BPM = 240;

interface BpmRange {
  min: number;
  max: number;
}

function isIntegerInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

export function resolveBpm(
  requestedBpm: GenerationSettings["bpm"],
  randomRange: BpmRange,
  seed: Seed,
): number {
  if (requestedBpm !== "random") {
    if (!isIntegerInRange(requestedBpm, MIN_MANUAL_BPM, MAX_MANUAL_BPM)) {
      throw new Error(
        `Manual BPM must be an integer from ${MIN_MANUAL_BPM} to ${MAX_MANUAL_BPM}.`,
      );
    }

    return requestedBpm;
  }

  if (
    !isIntegerInRange(randomRange.min, 1, MAX_MANUAL_BPM) ||
    !isIntegerInRange(randomRange.max, randomRange.min, MAX_MANUAL_BPM)
  ) {
    throw new Error("The style BPM range is invalid.");
  }

  const random = createSeededRandom(deriveSeed(seed, "tempo:bpm"));
  const valueCount = randomRange.max - randomRange.min + 1;

  return randomRange.min + Math.floor(random.next() * valueCount);
}
