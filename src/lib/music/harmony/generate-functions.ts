import type { StyleProfile } from "../domain/style-profile";
import type {
  GenerationSettings,
  HarmonicFunction,
  SectionLabel,
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
  sectionLabel: SectionLabel,
  chordCount: number,
  random: RandomSource,
): HarmonicFunction[] {
  if (chordCount < 2) {
    throw new Error("A section requires at least two harmonic events.");
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
