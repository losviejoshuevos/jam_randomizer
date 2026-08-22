import type { ChordDefinition, StyleProfile } from "../domain/style-profile";
import type {
  GeneratedChord,
  GenerationSettings,
  HarmonicFunction,
  JamSection,
  SectionLabel,
  SectionRole,
  Seed,
} from "../domain/types";
import {
  createActiveHarmonicPools,
  getAvailableChordDefinitions,
} from "../harmony/availability";
import { diversifyHalfBarChords } from "../harmony/diversify-half-bar-chords";
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

export interface GenerateSectionBRequest {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  sectionA: JamSection;
  label?: Exclude<SectionLabel, "A">;
  avoidSections?: JamSection[];
}

function sectionRole(label: Exclude<SectionLabel, "A">): SectionRole {
  if (label === "C") return "bridge";
  if (label === "D") return "coda";
  return "development";
}

function developmentFunctions(
  template: "chorus" | "bridge",
  chordCount: number,
  availableFunctions: ReadonlySet<HarmonicFunction>,
): HarmonicFunction[] {
  const chorusTemplates: Record<number, HarmonicFunction[]> = {
    1: ["predominant"],
    2: ["predominant", "tonic"],
    4: ["predominant", "color", "dominant", "tonic"],
    8: [
      "predominant",
      "predominant",
      "color",
      "tonic",
      "predominant",
      "dominant",
      "color",
      "tonic",
    ],
  };
  const bridgeTemplates: Record<number, HarmonicFunction[]> = {
    1: ["dominant"],
    2: ["color", "dominant"],
    4: ["color", "predominant", "color", "dominant"],
    8: [
      "color",
      "color",
      "predominant",
      "dominant",
      "color",
      "predominant",
      "dominant",
      "dominant",
    ],
  };
  const selected = (template === "chorus" ? chorusTemplates : bridgeTemplates)[
    chordCount
  ];

  if (!selected) {
    throw new Error(`No development template supports ${chordCount} chords.`);
  }

  return selected.map((harmonicFunction) => {
    if (availableFunctions.has(harmonicFunction)) {
      return harmonicFunction;
    }

    if (harmonicFunction === "color" && availableFunctions.has("predominant")) {
      return "predominant";
    }

    throw new Error(`Section B lacks a ${harmonicFunction} chord.`);
  });
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
  label: Exclude<SectionLabel, "A">,
  role: SectionRole,
  template: "chorus" | "bridge",
  startsOnRootTonic: boolean,
): JamSection {
  const random = createSeededRandom(attemptSeed);
  const activePools = createActiveHarmonicPools(settings, random);
  const bars = weightedChoice(profile.sectionRules.B.bars, random);
  const durations = generateHarmonicRhythm(
    profile,
    "B",
    bars,
    settings.meter,
    settings.complexity,
    random,
  );
  const availableDefinitions = getAvailableChordDefinitions(
    profile,
    settings,
    undefined,
    activePools,
  );
  const availableFunctions = new Set(
    availableDefinitions.map(({ harmonicFunction }) => harmonicFunction),
  );
  const functions = developmentFunctions(
    template,
    durations.length,
    availableFunctions,
  );
  const selected = selectChordDefinitions(
    functions,
    profile,
    settings,
    random,
    activePools,
  );
  const startingDefinition = selectSectionStartDefinition(
    profile,
    settings,
    "B",
    startsOnRootTonic,
    random,
    activePools,
  );
  selected.functions[0] = startingDefinition.harmonicFunction;
  selected.definitions[0] = startingDefinition;

  const definitions = diversifyHalfBarChords(
    selected.definitions,
    durations,
    profile,
    settings,
    random,
    activePools,
  );

  if (template === "chorus" && definitions.length > 1) {
    const returningTonic = availableDefinitions.find(
      ({ harmonicFunction, roman }) =>
        harmonicFunction === "tonic" &&
        (/^I(?:maj|\d|$)/.test(roman) || /^i(?:\d|$)/.test(roman)),
    );

    if (returningTonic) {
      definitions[definitions.length - 1] = returningTonic;
    }
  }

  return {
    id: `section-${deriveSeed(attemptSeed, "id")}`,
    label,
    displayName: `Тема ${label}`,
    role,
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
    chords: materializeChords(
      definitions,
      durations,
      attemptSeed,
      settings,
    ),
  };
}

function sameHarmony(left: JamSection, right: JamSection): boolean {
  return (
    left.chords.map(({ roman }) => roman).join("|") ===
    right.chords.map(({ roman }) => roman).join("|")
  );
}

function createFallback(
  seed: Seed,
  settings: GenerationSettings,
  profile: StyleProfile,
  label: Exclude<SectionLabel, "A">,
  role: SectionRole,
  template: "chorus" | "bridge",
): JamSection {
  const functions: HarmonicFunction[] =
    template === "chorus"
      ? ["predominant", "tonic"]
      : [
          getAvailableChordDefinitions(profile, settings, "color").length > 0
            ? "color"
            : "predominant",
          "dominant",
        ];
  const random = createSeededRandom(deriveSeed(seed, `section:${label}:fallback`));
  const selected = selectChordDefinitions(
    functions,
    profile,
    settings,
    random,
  );
  const attemptSeed = deriveSeed(seed, `section:${label}:fallback:materialized`);

  return {
    id: `section-${deriveSeed(attemptSeed, "id")}`,
    label,
    displayName: `Тема ${label}`,
    role,
    bars: 4,
    repeats: 1,
    locked: false,
    generationSeed: attemptSeed,
    harmonySettings: {
      key: settings.key,
      mode: settings.mode,
      complexity: settings.complexity,
      harmonicFreedom: settings.harmonicFreedom,
    },
    chords: materializeChords(selected.definitions, [2, 2], attemptSeed, settings),
  };
}

export function generateSectionB(
  request: GenerateSectionBRequest,
): GenerationResult<JamSection> {
  const { seed, settings, styleProfile, sectionA } = request;
  const label = request.label ?? "B";
  if (styleProfile.generatorKind === "rock") {
    return generateRockSection({
      seed,
      settings,
      styleProfile,
      label,
      sectionA,
    });
  }
  if (styleProfile.generatorKind === "blues") {
    return generateBluesSection({
      seed,
      settings,
      styleProfile,
      label,
    });
  }
  if (styleProfile.generatorKind === "soul") {
    return generateSoulSection({
      seed,
      settings,
      styleProfile,
      label,
      avoidSections: request.avoidSections ?? [sectionA],
    });
  }
  if (styleProfile.generatorKind === "jazz") {
    return generateJazzSection({
      seed,
      settings,
      styleProfile,
      label,
      avoidSections: request.avoidSections ?? [sectionA],
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
      label,
      generatorKind: styleProfile.generatorKind,
      avoidSections: request.avoidSections ?? [sectionA],
    });
  }
  const role = sectionRole(label);
  const template = label === "C" ? "bridge" : "chorus";
  const tonicStartProbability = label === "B" ? 0.4 : label === "C" ? 0.2 : 0.6;
  const startsOnRootTonic =
    createSeededRandom(deriveSeed(seed, `section:${label}:start-root-tonic`)).next() <
    tonicStartProbability;
  const avoidSections = request.avoidSections ?? [sectionA];

  for (
    let attempt = 0;
    attempt < styleProfile.validationRules.maximumGenerationAttempts;
    attempt += 1
  ) {
    const attemptSeed = deriveSeed(seed, `section:${label}:attempt:${attempt}`);
    const section = createAttempt(
      attemptSeed,
      settings,
      styleProfile,
      label,
      role,
      template,
      startsOnRootTonic,
    );
    const validation = validateGeneratedSection(
      section,
      "B",
      styleProfile,
      settings,
    );

    if (
      validation.valid &&
      avoidSections.every((reference) => !sameHarmony(section, reference))
    ) {
      return { value: section, attempts: attempt + 1, usedFallback: false };
    }
  }

  return {
    value: createFallback(seed, settings, styleProfile, label, role, template),
    attempts: styleProfile.validationRules.maximumGenerationAttempts,
    usedFallback: true,
  };
}
