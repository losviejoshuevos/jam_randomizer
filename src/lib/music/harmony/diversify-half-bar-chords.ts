import type { ChordDefinition, StyleProfile } from "../domain/style-profile";
import type { GenerationSettings } from "../domain/types";
import type { RandomSource } from "../random";
import { weightedChoice } from "../random";
import { getAvailableChordDefinitions } from "./availability";

export function diversifyHalfBarChords(
  definitions: readonly ChordDefinition[],
  durations: readonly number[],
  profile: StyleProfile,
  settings: GenerationSettings,
  random: RandomSource,
): ChordDefinition[] {
  const result = [...definitions];
  const available = getAvailableChordDefinitions(profile, settings).filter(
    ({ tags }) => !tags?.includes("must-resolve"),
  );

  for (let index = 1; index < result.length; index += 1) {
    const previous = result[index - 1];
    const current = result[index];
    const formsHalfBarPair =
      durations[index - 1] === 0.5 && durations[index] === 0.5;

    if (!formsHalfBarPair || !previous || !current || previous.roman !== current.roman) {
      continue;
    }

    const sameFunction = available.filter(
      ({ harmonicFunction, roman }) =>
        harmonicFunction === current.harmonicFunction && roman !== previous.roman,
    );
    const candidates =
      sameFunction.length > 0
        ? sameFunction
        : available.filter(({ roman }) => roman !== previous.roman);

    if (candidates.length > 0) {
      result[index] = weightedChoice(
        candidates.map((definition) => ({
          value: definition,
          weight: definition.weight,
        })),
        random,
      );
    }
  }

  return result;
}
