import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "../domain/style-profile";
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
  activePools?: ReadonlySet<HarmonicPool>,
): ChordDefinition[] {
  const result = [...definitions];
  const available = getAvailableChordDefinitions(
    profile,
    settings,
    undefined,
    activePools,
  ).filter(
    ({ tags }) => !tags?.includes("must-resolve"),
  );
  const rootTonicRomans =
    settings.mode === "major"
      ? new Set(["I9", "I13"])
      : new Set(["i9", "i11", "i13"]);
  const chromaticApproachRomans = new Set(["bII9", "bII13", "bII7#9"]);
  const rootTonicColors = available.filter(({ roman }) =>
    rootTonicRomans.has(roman),
  );
  const chromaticApproaches = available.filter(({ roman }) =>
    chromaticApproachRomans.has(roman),
  );
  const descendingDominants = available.filter(({ roman }) =>
    /^(?:v7|v9|v11)$/.test(roman),
  );
  const descendingPassing = available.filter(({ roman }) =>
    /^(?:bv7|bv9)$/.test(roman),
  );
  const descendingSubdominants = available.filter(({ roman }) =>
    /^(?:iv7|iv9|iv11)$/.test(roman),
  );
  const hasHalfBarPair = durations.some(
    (duration, index) => duration === 0.5 && durations[index + 1] === 0.5,
  );

  if (
    settings.mode === "minor" &&
    hasHalfBarPair &&
    result.length >= 3 &&
    descendingDominants.length > 0 &&
    descendingPassing.length > 0 &&
    descendingSubdominants.length > 0 &&
    random.next() < 0.5
  ) {
    const choose = (definitions: ChordDefinition[]) =>
      weightedChoice(
        definitions.map((definition) => ({
          value: definition,
          weight: definition.weight,
        })),
        random,
      );

    result[0] = choose(descendingDominants);
    result[1] = choose(descendingPassing);
    result[2] = choose(descendingSubdominants);
    return result;
  }

  for (let index = 1; index < result.length; index += 1) {
    const previous = result[index - 1];
    const current = result[index];
    const formsHalfBarPair =
      durations[index - 1] === 0.5 && durations[index] === 0.5;

    if (!formsHalfBarPair || !previous || !current) continue;

    if (rootTonicColors.length > 0 && chromaticApproaches.length > 0) {
      const tonic = weightedChoice(
        rootTonicColors.map((definition) => ({
          value: definition,
          weight: definition.weight,
        })),
        random,
      );
      const chromatic = weightedChoice(
        chromaticApproaches.map((definition) => ({
          value: definition,
          weight: definition.weight,
        })),
        random,
      );

      if (random.next() < 0.5) {
        result[index - 1] = tonic;
        result[index] = chromatic;
      } else {
        result[index - 1] = chromatic;
        result[index] = tonic;
      }
      continue;
    }

    if (previous.roman !== current.roman) continue;

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
