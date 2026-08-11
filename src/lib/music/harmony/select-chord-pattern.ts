import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "../domain/style-profile";
import type {
  GenerationSettings,
  GeneratorSectionLabel,
  WeightedValue,
} from "../domain/types";
import type { RandomSource } from "../random";
import { weightedChoice } from "../random";
import { getAvailableChordDefinitions } from "./availability";

export function selectHarmonicChordPattern(
  profile: StyleProfile,
  settings: GenerationSettings,
  sectionLabel: GeneratorSectionLabel,
  chordCount: number,
  random: RandomSource,
  activePools?: ReadonlySet<HarmonicPool>,
): ChordDefinition[] | null {
  const availableDefinitions = getAvailableChordDefinitions(
    profile,
    settings,
    undefined,
    activePools,
  );
  const patternChoices: WeightedValue<ChordDefinition[] | null>[] = [];

  for (const pattern of profile.harmonicChordPatterns ?? []) {
    if (
      !pattern.allowedSections.includes(sectionLabel) ||
      !pattern.allowedComplexities.includes(settings.complexity) ||
      !pattern.allowedModes.includes(settings.mode) ||
      pattern.romanChords.length !== chordCount
    ) {
      continue;
    }

    const definitions = pattern.romanChords.map((roman) =>
      availableDefinitions.find((definition) => definition.roman === roman),
    );

    if (definitions.every((definition) => definition !== undefined)) {
      patternChoices.push({
        value: definitions as ChordDefinition[],
        weight: pattern.weight,
      });
    }
  }

  if (patternChoices.length === 0) {
    return null;
  }

  patternChoices.push({
    value: null,
    weight: profile.genericHarmonyWeight ?? 1,
  });

  return weightedChoice(patternChoices, random);
}
