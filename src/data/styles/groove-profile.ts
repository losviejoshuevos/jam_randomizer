import type {
  ChordDefinition,
  HarmonicPool,
  StyleProfile,
} from "@/lib/music/domain/style-profile";
import type {
  HarmonicFunction,
  Meter,
  Mode,
  WeightedValue,
} from "@/lib/music/domain/types";
import type {
  GrooveArchetype,
  GrooveChordCategory,
  GrooveColorPalette,
} from "@/lib/music/groove/groove-style-types";
import {
  createSeededRandom,
  deriveSeed,
  weightedChoice,
} from "@/lib/music/random";

export interface GrooveRootDefinition {
  root: string;
  harmonicFunction: HarmonicFunction;
  modes: Mode[];
  pool: HarmonicPool;
  weight?: number;
}

function category(root: GrooveRootDefinition): GrooveChordCategory {
  const minor = /(?:^|[b#])[iv]+$/.test(root.root);
  if (root.harmonicFunction === "dominant") return "dominant";
  if (root.harmonicFunction === "tonic") {
    return minor ? "tonic-minor" : "tonic-major";
  }
  return minor ? "minor" : "major";
}

function vocabulary(
  roots: GrooveRootDefinition[],
  palette: GrooveColorPalette,
): ChordDefinition[] {
  const definitions: ChordDefinition[] = [];
  for (const root of roots) {
    definitions.push({
      roman: root.root,
      harmonicFunction: root.harmonicFunction,
      minimumComplexity: "easy",
      allowedModes: root.modes,
      harmonicPool: root.pool,
      weight: root.weight ?? 12,
    });
    const chordCategory = category(root);
    for (const complexity of ["medium", "advanced"] as const) {
      const suffixes = new Set(
        palette[complexity][chordCategory]
          .map(({ value }) => value)
          .filter(Boolean),
      );
      for (const suffix of suffixes) {
        definitions.push({
          roman: `${root.root}${suffix}`,
          harmonicFunction: root.harmonicFunction,
          minimumComplexity: complexity,
          allowedModes: root.modes,
          harmonicPool: root.pool,
          weight: complexity === "medium" ? 8 : 5,
        });
      }
    }
  }
  return definitions;
}

const BASE_RULE = {
  bars: [{ value: 8, weight: 5 }, { value: 4, weight: 2 }],
  allowedStartFunctions: [
    { value: "tonic" as const, weight: 7 },
    { value: "predominant" as const, weight: 2 },
    { value: "color" as const, weight: 1 },
  ],
  allowedEndFunctions: [
    { value: "tonic" as const, weight: 6 },
    { value: "dominant" as const, weight: 2 },
    { value: "color" as const, weight: 2 },
  ],
  tension: "medium" as const,
  minimumDistinctFunctions: 1,
  requireLoopability: true,
};

export function resolveGrooveStyleProfile(input: {
  styleId: string;
  name: string;
  generatorKind: "neo-soul" | "reggae" | "disco" | "country";
  seed: string;
  requestedArchetypeId?: string;
  archetypes: GrooveArchetype[];
  palette: GrooveColorPalette;
  roots: GrooveRootDefinition[];
  allowedMeters?: WeightedValue<Meter>[];
  allowedModes?: WeightedValue<Mode>[];
}): StyleProfile {
  const random = createSeededRandom(
    deriveSeed(input.seed, `${input.styleId}:session-profile`),
  );
  const selected =
    input.requestedArchetypeId &&
    input.archetypes.some(({ id }) => id === input.requestedArchetypeId)
      ? input.archetypes.find(({ id }) => id === input.requestedArchetypeId)!
      : weightedChoice(
          input.archetypes.map((archetype) => ({
            value: archetype,
            weight: archetype.weight,
          })),
          random,
        );

  return {
    id: input.styleId,
    name: input.name,
    generatorKind: input.generatorKind,
    archetypeId: selected.id,
    bpmRange: selected.bpmRange,
    bpmRanges: selected.bpmRanges,
    allowedMeters: input.allowedMeters ?? [
      { value: "4/4", weight: 96 },
      { value: "3/4", weight: 4 },
    ],
    allowedModes: input.allowedModes ?? [
      { value: "major", weight: 58 },
      { value: "minor", weight: 42 },
    ],
    chordVocabulary: vocabulary(input.roots, input.palette),
    transitions: {
      tonic: [
        { value: "tonic", weight: 4 },
        { value: "predominant", weight: 3 },
        { value: "color", weight: 2 },
        { value: "dominant", weight: 1 },
      ],
      predominant: [
        { value: "dominant", weight: 4 },
        { value: "tonic", weight: 4 },
        { value: "color", weight: 2 },
      ],
      dominant: [
        { value: "tonic", weight: 7 },
        { value: "color", weight: 2 },
        { value: "dominant", weight: 1 },
      ],
      color: [
        { value: "tonic", weight: 5 },
        { value: "predominant", weight: 2 },
        { value: "dominant", weight: 2 },
        { value: "color", weight: 1 },
      ],
      passing: [
        { value: "tonic", weight: 5 },
        { value: "predominant", weight: 3 },
        { value: "dominant", weight: 2 },
      ],
    },
    harmonicRhythms: [],
    sectionRules: {
      A: BASE_RULE,
      B: { ...BASE_RULE, requireLoopability: false },
    },
    harmonicPoolWeights: {
      strict: {
        core: 1,
        nearby: 0,
        "chromatic-near": 0,
        "chromatic-medium": 0,
        "chromatic-far": 0,
      },
      colorful: {
        core: 1,
        nearby: 0.42,
        "chromatic-near": 0,
        "chromatic-medium": 0,
        "chromatic-far": 0,
      },
      adventurous: {
        core: 1,
        nearby: 0.65,
        "chromatic-near": 0.3,
        "chromatic-medium": 0.12,
        "chromatic-far": 0,
      },
    },
    validationRules: {
      maximumSameChordInSequence: 8,
      maximumGenerationAttempts: 10,
      maximumPassingDurationBars: 1,
      requireDifferentBFromA: true,
    },
  };
}
