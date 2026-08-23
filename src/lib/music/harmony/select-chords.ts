import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "../domain/style-profile";
import type {
  GenerationSettings,
  HarmonicFunction,
  WeightedValue,
} from "../domain/types";
import type { RandomSource } from "../random";
import { weightedChoice } from "../random";
import {
  getAvailableChordDefinitions,
  getHarmonicPoolWeight,
} from "./availability";

function chooseDefinition(
  definitions: ChordDefinition[],
  profile: StyleProfile,
  settings: GenerationSettings,
  random: RandomSource,
): ChordDefinition {
  const pools = [...new Set(definitions.map(({ harmonicPool }) => harmonicPool))];
  const poolChoices: WeightedValue<HarmonicPool>[] = pools.map((pool) => {
    return {
      value: pool,
      weight: getHarmonicPoolWeight(pool, profile, settings),
    };
  });
  const selectedPool = weightedChoice(poolChoices, random);
  const chordChoices = definitions
    .filter(({ harmonicPool }) => harmonicPool === selectedPool)
    .map((definition) => ({ value: definition, weight: definition.weight }));

  return weightedChoice(chordChoices, random);
}

export interface SelectedHarmony {
  functions: HarmonicFunction[];
  definitions: ChordDefinition[];
}

export function selectChordDefinitions(
  initialFunctions: readonly HarmonicFunction[],
  profile: StyleProfile,
  settings: GenerationSettings,
  random: RandomSource,
  activePools?: ReadonlySet<HarmonicPool>,
): SelectedHarmony {
  const functions = [...initialFunctions];
  const definitions: ChordDefinition[] = [];
  let mustResolveToDominant = false;

  for (let index = 0; index < functions.length; index += 1) {
    if (mustResolveToDominant) {
      functions[index] = "dominant";
    }

    const isLast = index === functions.length - 1;
    let candidates = getAvailableChordDefinitions(
      profile,
      settings,
      functions[index],
      activePools,
    );

    if (mustResolveToDominant || isLast) {
      candidates = candidates.filter(
        ({ tags }) => !tags?.includes("must-resolve"),
      );
    }

    if (candidates.length === 0) {
      throw new Error(
        `No chord is available for ${functions[index]} in ${settings.mode}.`,
      );
    }

    const definition = chooseDefinition(
      candidates,
      profile,
      settings,
      random,
    );
    definitions.push(definition);
    mustResolveToDominant = definition.tags?.includes("must-resolve") ?? false;
  }

  return { functions, definitions };
}
