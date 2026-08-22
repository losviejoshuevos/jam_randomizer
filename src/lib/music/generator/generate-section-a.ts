import type { ChordDefinition, StyleProfile } from "../domain/style-profile";
import type {
  GeneratedChord,
  GenerationSettings,
  JamSection,
  Seed,
} from "../domain/types";
import { generateHarmonicFunctions } from "../harmony/generate-functions";
import {
  createActiveHarmonicPools,
  getAvailableChordDefinitions,
} from "../harmony/availability";
import { diversifyHalfBarChords } from "../harmony/diversify-half-bar-chords";
import { selectHarmonicChordPattern } from "../harmony/select-chord-pattern";
import { selectChordDefinitions } from "../harmony/select-chords";
import { selectSectionStartDefinition } from "../harmony/select-section-start";
import { createSeededRandom, deriveSeed, weightedChoice } from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";
import { generateHarmonicRhythm } from "../structure/harmonic-rhythm";
import { validateGeneratedSection } from "../validation/validate-section";
import type { GenerationResult } from "./contracts";
import { generateRockSection } from "../rock/generate-rock-section";
import { generateBluesSection } from "../blues/generate-blues-section";
import { generateSoulSection } from "../soul/generate-soul-section";
import { generateJazzSection } from "../jazz/generate-jazz-section";
import { generateConfiguredGrooveSection } from "../groove/generate-configured-groove-section";

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
  startsOnRootTonic: boolean,
): JamSection {
  const random = createSeededRandom(attemptSeed);
  const activePools = createActiveHarmonicPools(settings, random);
  const bars = weightedChoice(profile.sectionRules.A.bars, random);
  const durations = generateHarmonicRhythm(
    profile,
    "A",
    bars,
    settings.meter,
    settings.complexity,
    random,
  );
  const chordPattern = selectHarmonicChordPattern(
    profile,
    settings,
    "A",
    durations.length,
    random,
    activePools,
  );
  const selectedDefinitions =
    chordPattern ??
    selectChordDefinitions(
      generateHarmonicFunctions(
        profile,
        settings,
        "A",
        durations.length,
        random,
      ),
      profile,
      settings,
      random,
      activePools,
    ).definitions;
  selectedDefinitions[0] = selectSectionStartDefinition(
    profile,
    settings,
    "A",
    startsOnRootTonic,
    random,
    activePools,
  );
  const definitions = diversifyHalfBarChords(
    selectedDefinitions,
    durations,
    profile,
    settings,
    random,
    activePools,
  );

  return {
    id: `section-${deriveSeed(attemptSeed, "id")}`,
    label: "A",
    displayName: "Тема A",
    role: "theme",
    bars,
    repeats: 1,
    locked: false,
    generationSeed: attemptSeed,
    harmonySettings: {
      key: settings.key,
      mode: settings.mode,
      complexity: settings.complexity,
      harmonicFreedom: settings.harmonicFreedom,
    },
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
    settings,
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
  const definitions = [highestWeightDefinition(profile, settings, "tonic")];

  return {
    id: `section-${deriveSeed(fallbackSeed, "id")}`,
    label: "A",
    displayName: "Тема A",
    role: "theme",
    bars: 4,
    repeats: 1,
    locked: false,
    generationSeed: fallbackSeed,
    harmonySettings: {
      key: settings.key,
      mode: settings.mode,
      complexity: settings.complexity,
      harmonicFreedom: settings.harmonicFreedom,
    },
    chords: materializeChords(
      definitions,
      [4],
      fallbackSeed,
      settings,
    ),
  };
}

export function generateSectionA(
  request: GenerateSectionARequest,
): GenerationResult<JamSection> {
  const { seed, settings, styleProfile } = request;
  if (styleProfile.generatorKind === "rock") {
    return generateRockSection({
      seed,
      settings,
      styleProfile,
      label: "A",
    });
  }
  if (styleProfile.generatorKind === "blues") {
    return generateBluesSection({
      seed,
      settings,
      styleProfile,
      label: "A",
    });
  }
  if (styleProfile.generatorKind === "soul") {
    return generateSoulSection({
      seed,
      settings,
      styleProfile,
      label: "A",
    });
  }
  if (styleProfile.generatorKind === "jazz") {
    return generateJazzSection({
      seed,
      settings,
      styleProfile,
      label: "A",
    });
  }
  if (
    styleProfile.generatorKind === "neo-soul" ||
    styleProfile.generatorKind === "reggae" ||
    styleProfile.generatorKind === "disco" ||
    styleProfile.generatorKind === "country"
  ) {
    return generateConfiguredGrooveSection({
      seed,
      settings,
      styleProfile,
      label: "A",
      generatorKind: styleProfile.generatorKind,
    });
  }
  const startsOnRootTonic =
    createSeededRandom(deriveSeed(seed, "section:A:start-root-tonic")).next() <
    0.7;

  for (
    let attempt = 0;
    attempt < styleProfile.validationRules.maximumGenerationAttempts;
    attempt += 1
  ) {
    const attemptSeed = deriveSeed(seed, `section:A:attempt:${attempt}`);
    const section = createAttempt(
      attemptSeed,
      settings,
      styleProfile,
      startsOnRootTonic,
    );
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
