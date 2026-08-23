import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "../domain/style-profile";
import type {
  Complexity,
  GenerationSettings,
  HarmonicFunction,
} from "../domain/types";
import type { RandomSource } from "../random";

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

const POOL_CARD_CHANCE: Partial<Record<HarmonicPool, number>> = {
  "chromatic-near": 0.8,
  "chromatic-medium": 0.6,
  "chromatic-far": 0.2,
};

export function getHarmonicPoolWeight(
  pool: HarmonicPool,
  profile: StyleProfile,
  settings: GenerationSettings,
): number {
  return profile.harmonicPoolWeights[settings.harmonicFreedom][pool];
}

export function createActiveHarmonicPools(
  settings: GenerationSettings,
  random: RandomSource,
): ReadonlySet<HarmonicPool> {
  const active = new Set<HarmonicPool>(["core"]);

  if (settings.harmonicFreedom === "strict") {
    return active;
  }

  active.add("nearby");

  if (settings.harmonicFreedom === "colorful") {
    return active;
  }

  for (const pool of [
    "chromatic-near",
    "chromatic-medium",
    "chromatic-far",
  ] as const) {
    if (random.next() < (POOL_CARD_CHANCE[pool] ?? 0)) {
      active.add(pool);
    }
  }

  return active;
}

export function getAvailableChordDefinitions(
  profile: StyleProfile,
  settings: GenerationSettings,
  harmonicFunction?: HarmonicFunction,
  activePools?: ReadonlySet<HarmonicPool>,
): ChordDefinition[] {
  return profile.chordVocabulary.filter((definition) => {
    return (
      (harmonicFunction === undefined ||
        definition.harmonicFunction === harmonicFunction) &&
      definition.allowedModes.includes(settings.mode) &&
      (definition.allowedComplexities?.includes(settings.complexity) ??
        isComplexityAllowed(definition.minimumComplexity, settings.complexity)) &&
      getHarmonicPoolWeight(definition.harmonicPool, profile, settings) > 0 &&
      (activePools === undefined || activePools.has(definition.harmonicPool))
    );
  });
}
