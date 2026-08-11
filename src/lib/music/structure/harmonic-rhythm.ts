import type { StyleProfile } from "../domain/style-profile";
import type {
  Complexity,
  Meter,
  GeneratorSectionLabel,
} from "../domain/types";
import { isComplexityAllowed } from "../harmony/availability";
import type { RandomSource } from "../random";
import { weightedChoice } from "../random";

export function generateHarmonicRhythm(
  profile: StyleProfile,
  sectionLabel: GeneratorSectionLabel,
  bars: number,
  meter: Meter,
  complexity: Complexity,
  random: RandomSource,
): number[] {
  const patterns = profile.harmonicRhythms.filter(({ value }) => {
    const patternBars = value.durationsBars.reduce(
      (total, duration) => total + duration,
      0,
    );

    return (
      value.allowedSections.includes(sectionLabel) &&
      value.allowedMeters.includes(meter) &&
      isComplexityAllowed(value.minimumComplexity, complexity) &&
      patternBars > 0 &&
      bars % patternBars === 0
    );
  });

  if (patterns.length === 0) {
    throw new Error(`No harmonic rhythm fills ${bars} bars in ${meter}.`);
  }

  const selected = weightedChoice(patterns, random).durationsBars;
  const selectedBars = selected.reduce((total, duration) => total + duration, 0);
  const repeats = bars / selectedBars;

  return Array.from({ length: repeats }, () => selected).flat();
}
