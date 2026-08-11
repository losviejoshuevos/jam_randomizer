import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "../domain/style-profile";
import type { GenerationSettings, GeneratorSectionLabel } from "../domain/types";
import type { RandomSource } from "../random";
import { weightedChoice } from "../random";
import {
  getAvailableChordDefinitions,
  getHarmonicPoolWeight,
} from "./availability";

function isRootTonic({ roman }: ChordDefinition): boolean {
  return /^I(?:maj|\d|$)/.test(roman) || /^i(?:\d|$)/.test(roman);
}

export function selectSectionStartDefinition(
  profile: StyleProfile,
  settings: GenerationSettings,
  sectionLabel: GeneratorSectionLabel,
  preferRootTonic: boolean,
  random: RandomSource,
  activePools?: ReadonlySet<HarmonicPool>,
): ChordDefinition {
  const startFunctionWeights = new Map(
    profile.sectionRules[sectionLabel].allowedStartFunctions.map(
      ({ value, weight }) => [value, weight],
    ),
  );
  const available = getAvailableChordDefinitions(
    profile,
    settings,
    undefined,
    activePools,
  ).filter(
    ({ harmonicFunction }) => startFunctionWeights.has(harmonicFunction),
  );
  const tonic = available.filter(isRootTonic);
  const nonTonic = available.filter((definition) => !isRootTonic(definition));
  const candidates = preferRootTonic
    ? tonic.length > 0
      ? tonic
      : nonTonic
    : nonTonic.length > 0
      ? nonTonic
      : tonic;

  return weightedChoice(
    candidates.map((definition) => ({
      value: definition,
      weight:
        definition.weight *
        (startFunctionWeights.get(definition.harmonicFunction) ?? 0) *
        getHarmonicPoolWeight(definition.harmonicPool, profile, settings),
    })),
    random,
  );
}
