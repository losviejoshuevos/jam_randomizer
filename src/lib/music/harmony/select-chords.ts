import type {
  ChordDefinition,
  StyleProfile,
  TonalSource,
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
  getTonalSourceWeight,
} from "./availability";

type TonalSourceKind = TonalSource["kind"];

function chooseDefinition(
  definitions: ChordDefinition[],
  profile: StyleProfile,
  settings: GenerationSettings,
  random: RandomSource,
): ChordDefinition {
  const sourceKinds = [...new Set(definitions.map(({ tonalSource }) => tonalSource.kind))];
  const sourceChoices: WeightedValue<TonalSourceKind>[] = sourceKinds.map((kind) => {
    const example = definitions.find(
      ({ tonalSource }) => tonalSource.kind === kind,
    ) as ChordDefinition;

    return {
      value: kind,
      weight: getTonalSourceWeight(example.tonalSource, profile, settings),
    };
  });
  const selectedSource = weightedChoice(sourceChoices, random);
  const chordChoices = definitions
    .filter(({ tonalSource }) => tonalSource.kind === selectedSource)
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
