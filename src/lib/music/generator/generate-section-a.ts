import type { ChordDefinition, StyleProfile } from "../domain/style-profile";
import type {
  GeneratedChord,
  GenerationSettings,
  JamSection,
  Seed,
} from "../domain/types";
import { generateHarmonicFunctions } from "../harmony/generate-functions";
import { getAvailableChordDefinitions } from "../harmony/availability";
import { selectChordDefinitions } from "../harmony/select-chords";
import { createSeededRandom, deriveSeed, weightedChoice } from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";
import { generateHarmonicRhythm } from "../structure/harmonic-rhythm";
import { validateGeneratedSection } from "../validation/validate-section";
import type { GenerationResult } from "./contracts";

export interface GenerateSectionARequest {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
}

function materializeChords(
  definitions: readonly ChordDefinition[],
  durations: readonly number[],
  sectionSeed: Seed,
  settings: GenerationSettings,
): GeneratedChord[] {
  let startBar = 0;

  return definitions.map((definition, index) => {
    const chord: GeneratedChord = {
      id: `chord-${deriveSeed(sectionSeed, `chord:${index}`)}`,
      source: "generated",
      roman: definition.roman,
      renderedSymbol: renderRomanChord(
        definition.roman,
        settings.key,
        settings.mode,
      ),
      harmonicFunction: definition.harmonicFunction,
      startBar,
      durationBars: durations[index],
    };

    startBar += durations[index];
    return chord;
  });
}

function createAttempt(
  attemptSeed: Seed,
  settings: GenerationSettings,
  profile: StyleProfile,
): JamSection {
  const random = createSeededRandom(attemptSeed);
  const bars = weightedChoice(profile.sectionRules.A.bars, random);
  const durations = generateHarmonicRhythm(
    profile,
    "A",
    bars,
    settings.meter,
    settings.complexity,
    random,
  );
  const initialFunctions = generateHarmonicFunctions(
    profile,
    settings,
    "A",
    durations.length,
    random,
  );
  const { definitions } = selectChordDefinitions(
    initialFunctions,
    profile,
    settings,
    random,
  );

  return {
    id: `section-${deriveSeed(attemptSeed, "id")}`,
    label: "A",
    displayName: "Theme A",
    bars,
    repeats: 1,
    locked: false,
    generationSeed: attemptSeed,
    chords: materializeChords(definitions, durations, attemptSeed, settings),
  };
}

function highestWeightDefinition(
  profile: StyleProfile,
  settings: GenerationSettings,
  harmonicFunction: "tonic" | "predominant" | "dominant",
): ChordDefinition {
  const definitions = getAvailableChordDefinitions(
    profile,
    { ...settings, complexity: "easy", harmonicFreedom: "strict" },
    harmonicFunction,
  ).sort((left, right) => right.weight - left.weight);

  if (!definitions[0]) {
    throw new Error(`Safe fallback lacks a ${harmonicFunction} chord.`);
  }

  return definitions[0];
}

function createSafeFallback(
  seed: Seed,
  settings: GenerationSettings,
  profile: StyleProfile,
): JamSection {
  const fallbackSeed = deriveSeed(seed, "section:A:fallback");
  const definitions = [
    highestWeightDefinition(profile, settings, "tonic"),
    highestWeightDefinition(profile, settings, "predominant"),
    highestWeightDefinition(profile, settings, "dominant"),
    highestWeightDefinition(profile, settings, "tonic"),
  ];

  return {
    id: `section-${deriveSeed(fallbackSeed, "id")}`,
    label: "A",
    displayName: "Theme A (safe fallback)",
    bars: 4,
    repeats: 1,
    locked: false,
    generationSeed: fallbackSeed,
    chords: materializeChords(
      definitions,
      [1, 1, 1, 1],
      fallbackSeed,
      settings,
    ),
  };
}

export function generateSectionA(
  request: GenerateSectionARequest,
): GenerationResult<JamSection> {
  const { seed, settings, styleProfile } = request;

  for (
    let attempt = 0;
    attempt < styleProfile.validationRules.maximumGenerationAttempts;
    attempt += 1
  ) {
    const attemptSeed = deriveSeed(seed, `section:A:attempt:${attempt}`);
    const section = createAttempt(attemptSeed, settings, styleProfile);
    const validation = validateGeneratedSection(
      section,
      "A",
      styleProfile,
      settings,
    );

    if (validation.valid) {
      return { value: section, attempts: attempt + 1, usedFallback: false };
    }
  }

  return {
    value: createSafeFallback(seed, settings, styleProfile),
    attempts: styleProfile.validationRules.maximumGenerationAttempts,
    usedFallback: true,
  };
}
