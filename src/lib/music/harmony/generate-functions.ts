import type { StyleProfile } from "../domain/style-profile";
import type {
  GenerationSettings,
  HarmonicFunction,
  GeneratorSectionLabel,
  WeightedValue,
} from "../domain/types";
import { getAvailableChordDefinitions } from "./availability";
import type { RandomSource } from "../random";
import { weightedChoice } from "../random";

function onlyAvailableFunctions(
  values: readonly WeightedValue<HarmonicFunction>[],
  availableFunctions: ReadonlySet<HarmonicFunction>,
): WeightedValue<HarmonicFunction>[] {
  return values.filter(({ value }) => availableFunctions.has(value));
}

export function generateHarmonicFunctions(
  profile: StyleProfile,
  settings: GenerationSettings,
  sectionLabel: GeneratorSectionLabel,
  chordCount: number,
  random: RandomSource,
): HarmonicFunction[] {
  if (chordCount < 1) {
    throw new Error("A section requires at least one harmonic event.");
  }

  const availableFunctions = new Set(
    getAvailableChordDefinitions(profile, settings).map(
      ({ harmonicFunction }) => harmonicFunction,
    ),
  );
  const rule = profile.sectionRules[sectionLabel];
  const startChoices = onlyAvailableFunctions(
    rule.allowedStartFunctions,
    availableFunctions,
  );
  const endChoices = onlyAvailableFunctions(
    rule.allowedEndFunctions,
    availableFunctions,
  );

  if (startChoices.length === 0 || endChoices.length === 0) {
    throw new Error(`Style profile cannot generate section ${sectionLabel}.`);
  }

  const styledPatterns = profile.harmonicFunctionPatterns
    ?.filter(
      (pattern) =>
        pattern.allowedSections.includes(sectionLabel) &&
        pattern.allowedComplexities.includes(settings.complexity) &&
        pattern.functions.length === chordCount &&
        pattern.functions.every((value) => availableFunctions.has(value)) &&
        startChoices.some(({ value }) => value === pattern.functions[0]) &&
        endChoices.some(({ value }) => value === pattern.functions.at(-1)),
    )
    .map((pattern) => ({ value: pattern.functions, weight: pattern.weight }));

  if (styledPatterns?.length) {
    return [...weightedChoice(styledPatterns, random)];
  }

  if (chordCount === 1) {
    const onlyFunction = weightedChoice(startChoices, random);
    if (!endChoices.some(({ value }) => value === onlyFunction)) {
      throw new Error(`Style profile cannot generate a one-chord ${sectionLabel} section.`);
    }
    return [onlyFunction];
  }

  const functions: HarmonicFunction[] = [weightedChoice(startChoices, random)];

  while (functions.length < chordCount - 1) {
    const previous = functions.at(-1) as HarmonicFunction;
    const transitions = onlyAvailableFunctions(
      profile.transitions[previous],
      availableFunctions,
    );

    if (transitions.length === 0) {
      throw new Error(`No available transition from ${previous}.`);
    }

    functions.push(weightedChoice(transitions, random));
  }

  functions.push(weightedChoice(endChoices, random));

  return functions;
}
