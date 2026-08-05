import type {
  ChordDefinition,
  StyleProfile,
  TonalSource,
} from "../domain/style-profile";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFunction,
} from "../domain/types";

const COMPLEXITY_RANK: Record<Complexity, number> = {
  easy: 0,
  medium: 1,
  advanced: 2,
};

export function isComplexityAllowed(
  minimum: Complexity,
  selected: Complexity,
): boolean {
  return COMPLEXITY_RANK[minimum] <= COMPLEXITY_RANK[selected];
}

export function getTonalSourceWeight(
  source: TonalSource,
  profile: StyleProfile,
  settings: GenerationSettings,
): number {
  const weights = profile.tonalSourceWeights[settings.harmonicFreedom];

  switch (source.kind) {
    case "diatonic":
      return weights.diatonic;
    case "parallel-mode":
      return weights.parallelMode;
    case "neighboring-key":
      return weights.neighboringKey;
  }
}

export function getAvailableChordDefinitions(
  profile: StyleProfile,
  settings: GenerationSettings,
  harmonicFunction?: HarmonicFunction,
): ChordDefinition[] {
  return profile.chordVocabulary.filter((definition) => {
    return (
      (harmonicFunction === undefined ||
        definition.harmonicFunction === harmonicFunction) &&
      definition.allowedModes.includes(settings.mode) &&
      (definition.allowedComplexities?.includes(settings.complexity) ??
        isComplexityAllowed(definition.minimumComplexity, settings.complexity)) &&
      getTonalSourceWeight(definition.tonalSource, profile, settings) > 0
    );
  });
}
