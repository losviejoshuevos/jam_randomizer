import type { ChordDefinition, StyleProfile } from "../domain/style-profile";
import type {
  GeneratedChord,
  GenerationSettings,
  HarmonicFunction,
  JamSection,
  SectionRole,
  Seed,
} from "../domain/types";
import { getAvailableChordDefinitions } from "../harmony/availability";
import { selectChordDefinitions } from "../harmony/select-chords";
import { createSeededRandom, deriveSeed, weightedChoice } from "../random";
import { renderRomanChord } from "../rendering/render-roman-chord";
import { generateHarmonicRhythm } from "../structure/harmonic-rhythm";
import { validateGeneratedSection } from "../validation/validate-section";
import type { GenerationResult } from "./contracts";

export interface GenerateSectionBRequest {
  seed: Seed;
  settings: GenerationSettings;
  styleProfile: StyleProfile;
  sectionA: JamSection;
}

function chooseDevelopmentRole(seed: Seed): Exclude<SectionRole, "theme"> {
  return weightedChoice(
    [
      { value: "chorus" as const, weight: 6 },
      { value: "bridge" as const, weight: 4 },
    ],
    createSeededRandom(deriveSeed(seed, "section:B:role")),
  );
}

function developmentFunctions(
  role: Exclude<SectionRole, "theme">,
  chordCount: number,
  availableFunctions: ReadonlySet<HarmonicFunction>,
): HarmonicFunction[] {
  const chorusTemplates: Record<number, HarmonicFunction[]> = {
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
  const selected = (role === "chorus" ? chorusTemplates : bridgeTemplates)[
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
  sectionA: JamSection,
  role: Exclude<SectionRole, "theme">,
): JamSection {
  const random = createSeededRandom(attemptSeed);
  const bars = weightedChoice(profile.sectionRules.B.bars, random);
  const durations = generateHarmonicRhythm(
    profile,
    "B",
    bars,
    settings.meter,
    settings.complexity,
    random,
  );
  const availableDefinitions = getAvailableChordDefinitions(profile, settings);
  const availableFunctions = new Set(
    availableDefinitions.map(({ harmonicFunction }) => harmonicFunction),
  );
  const functions = developmentFunctions(
    role,
    durations.length,
    availableFunctions,
  );
  const selected = selectChordDefinitions(
    functions,
    profile,
    settings,
    random,
  );

  if (role === "chorus") {
    const themeTonic = sectionA.chords.find(
      ({ harmonicFunction }) => harmonicFunction === "tonic",
    );
    const returningTonic = availableDefinitions.find(
      ({ harmonicFunction, roman }) =>
        harmonicFunction === "tonic" && roman === themeTonic?.roman,
    );

    if (returningTonic) {
      selected.functions[selected.functions.length - 1] = "tonic";
      selected.definitions[selected.definitions.length - 1] = returningTonic;
    }
  }

  return {
    id: `section-${deriveSeed(attemptSeed, "id")}`,
    label: "B",
    displayName: "Тема B",
    role,
    bars,
    repeats: 1,
    locked: false,
    generationSeed: attemptSeed,
    chords: materializeChords(
      selected.definitions,
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
  role: Exclude<SectionRole, "theme">,
): JamSection {
  const functions: HarmonicFunction[] =
    role === "chorus"
      ? ["predominant", "tonic"]
      : [
          getAvailableChordDefinitions(profile, settings, "color").length > 0
            ? "color"
            : "predominant",
          "dominant",
        ];
  const random = createSeededRandom(deriveSeed(seed, "section:B:fallback"));
  const selected = selectChordDefinitions(
    functions,
    profile,
    settings,
    random,
  );
  const attemptSeed = deriveSeed(seed, "section:B:fallback:materialized");

  return {
    id: `section-${deriveSeed(attemptSeed, "id")}`,
    label: "B",
    displayName: "Тема B",
    role,
    bars: 4,
    repeats: 1,
    locked: false,
    generationSeed: attemptSeed,
    chords: materializeChords(selected.definitions, [2, 2], attemptSeed, settings),
  };
}

export function generateSectionB(
  request: GenerateSectionBRequest,
): GenerationResult<JamSection> {
  const { seed, settings, styleProfile, sectionA } = request;
  const role = chooseDevelopmentRole(seed);

  for (
    let attempt = 0;
    attempt < styleProfile.validationRules.maximumGenerationAttempts;
    attempt += 1
  ) {
    const attemptSeed = deriveSeed(seed, `section:B:attempt:${attempt}`);
    const section = createAttempt(
      attemptSeed,
      settings,
      styleProfile,
      sectionA,
      role,
    );
    const validation = validateGeneratedSection(
      section,
      "B",
      styleProfile,
      settings,
    );

    if (validation.valid && !sameHarmony(section, sectionA)) {
      return { value: section, attempts: attempt + 1, usedFallback: false };
    }
  }

  return {
    value: createFallback(seed, settings, styleProfile, role),
    attempts: styleProfile.validationRules.maximumGenerationAttempts,
    usedFallback: true,
  };
}
