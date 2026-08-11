import type {
  ChordDefinition,
  HarmonicChordPattern,
  HarmonicPool,
  HarmonicFunctionPattern,
  StyleProfile,
} from "@/lib/music/domain/style-profile";
import type {
  Complexity,
  HarmonicFunction,
  Mode,
} from "@/lib/music/domain/types";

const ALL_COMPLEXITIES: Complexity[] = ["easy", "medium", "advanced"];

type RootQuality = "major" | "minor" | "diminished";

interface FunkRoot {
  romanRoot: string;
  quality: RootQuality;
  harmonicFunction: HarmonicFunction;
  harmonicPool: HarmonicPool;
  weight: number;
  tags?: string[];
}

const ROOTS_BY_MODE: Record<Mode, FunkRoot[]> = {
  major: [
    // C major example: C Am F Dm G Em.
    { romanRoot: "I", quality: "major", harmonicFunction: "tonic", harmonicPool: "core", weight: 18, tags: ["vamp"] },
    { romanRoot: "vi", quality: "minor", harmonicFunction: "tonic", harmonicPool: "core", weight: 1 },
    { romanRoot: "IV", quality: "major", harmonicFunction: "predominant", harmonicPool: "core", weight: 14 },
    { romanRoot: "ii", quality: "minor", harmonicFunction: "predominant", harmonicPool: "core", weight: 1 },
    { romanRoot: "V", quality: "major", harmonicFunction: "dominant", harmonicPool: "core", weight: 12 },
    { romanRoot: "iii", quality: "minor", harmonicFunction: "tonic", harmonicPool: "core", weight: 0.25, tags: ["tonic-substitute", "rare-color"] },
    // Colorful: Bb Gm D Bm Bdim.
    { romanRoot: "bVII", quality: "major", harmonicFunction: "color", harmonicPool: "nearby", weight: 2 },
    { romanRoot: "v", quality: "minor", harmonicFunction: "color", harmonicPool: "nearby", weight: 2 },
    { romanRoot: "II", quality: "major", harmonicFunction: "dominant", harmonicPool: "nearby", weight: 4, tags: ["must-resolve"] },
    { romanRoot: "vii", quality: "minor", harmonicFunction: "color", harmonicPool: "nearby", weight: 2 },
    { romanRoot: "vii", quality: "diminished", harmonicFunction: "dominant", harmonicPool: "nearby", weight: 2, tags: ["must-resolve"] },
    // Adventurous: modal mixture first, then the sharp side of the circle.
    { romanRoot: "bIII", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-near", weight: 4 },
    { romanRoot: "i", quality: "minor", harmonicFunction: "tonic", harmonicPool: "chromatic-near", weight: 2 },
    { romanRoot: "bVI", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-near", weight: 4 },
    { romanRoot: "iv", quality: "minor", harmonicFunction: "predominant", harmonicPool: "chromatic-near", weight: 5 },
    { romanRoot: "#iv", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-medium", weight: 2 },
    { romanRoot: "VI", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-medium", weight: 2 },
    { romanRoot: "III", quality: "major", harmonicFunction: "dominant", harmonicPool: "chromatic-medium", weight: 3 },
    { romanRoot: "#i", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-medium", weight: 1 },
    { romanRoot: "bII", quality: "major", harmonicFunction: "dominant", harmonicPool: "nearby", weight: 5 },
    { romanRoot: "bii", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "biii", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "#IV", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "bvi", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "bvii", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
  ],
  minor: [
    // A minor uses the same pitch collection as its relative C major,
    // but functions are heard from A: Am C F Dm G Em.
    { romanRoot: "i", quality: "minor", harmonicFunction: "tonic", harmonicPool: "core", weight: 18, tags: ["vamp"] },
    { romanRoot: "bIII", quality: "major", harmonicFunction: "tonic", harmonicPool: "core", weight: 1 },
    { romanRoot: "bVI", quality: "major", harmonicFunction: "predominant", harmonicPool: "core", weight: 1 },
    { romanRoot: "iv", quality: "minor", harmonicFunction: "predominant", harmonicPool: "core", weight: 14 },
    { romanRoot: "bVII", quality: "major", harmonicFunction: "color", harmonicPool: "core", weight: 1 },
    { romanRoot: "v", quality: "minor", harmonicFunction: "dominant", harmonicPool: "core", weight: 10 },
    // The same colorful pitch roots as for relative C major: Bb Gm D Bm Bdim.
    { romanRoot: "bII", quality: "major", harmonicFunction: "dominant", harmonicPool: "nearby", weight: 5 },
    { romanRoot: "bvii", quality: "minor", harmonicFunction: "color", harmonicPool: "nearby", weight: 2 },
    { romanRoot: "IV", quality: "major", harmonicFunction: "predominant", harmonicPool: "nearby", weight: 4 },
    { romanRoot: "ii", quality: "minor", harmonicFunction: "predominant", harmonicPool: "nearby", weight: 2 },
    { romanRoot: "ii", quality: "diminished", harmonicFunction: "predominant", harmonicPool: "nearby", weight: 2 },
    { romanRoot: "bV", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-near", weight: 3 },
    { romanRoot: "biii", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-near", weight: 3 },
    { romanRoot: "bI", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-near", weight: 3 },
    { romanRoot: "bvi", quality: "minor", harmonicFunction: "predominant", harmonicPool: "chromatic-near", weight: 4 },
    { romanRoot: "vi", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-medium", weight: 2 },
    { romanRoot: "I", quality: "major", harmonicFunction: "tonic", harmonicPool: "chromatic-medium", weight: 2 },
    { romanRoot: "V", quality: "major", harmonicFunction: "dominant", harmonicPool: "chromatic-medium", weight: 4 },
    { romanRoot: "iii", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-medium", weight: 1 },
    { romanRoot: "III", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "bv", quality: "minor", harmonicFunction: "passing", harmonicPool: "chromatic-near", weight: 2 },
    { romanRoot: "VI", quality: "major", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "bi", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "bii", quality: "minor", harmonicFunction: "color", harmonicPool: "chromatic-far", weight: 1 },
    { romanRoot: "II", quality: "major", harmonicFunction: "dominant", harmonicPool: "chromatic-far", weight: 1 },
  ],
};

interface ExtensionChoice {
  suffix: string;
  weight: number;
}

function extensions(...choices: [suffix: string, weight: number][]): ExtensionChoice[] {
  return choices.map(([suffix, weight]) => ({ suffix, weight }));
}

interface CuratedRootExtensions {
  medium: ExtensionChoice[];
  advanced: ExtensionChoice[];
}

const CURATED_EXTENSIONS: Record<
  Mode,
  Record<string, CuratedRootExtensions>
> = {
  major: {
    I: { medium: extensions(["maj7", 6], ["9", 7], ["7", 4]), advanced: extensions(["maj9", 6], ["13", 7], ["13sus4", 4], ["6/9", 3]) },
    vi: { medium: extensions(["7", 5], ["9", 3]), advanced: extensions(["11", 3]) },
    IV: { medium: extensions(["maj7", 5], ["9", 4]), advanced: extensions(["maj9", 5], ["13", 4]) },
    ii: { medium: extensions(["7", 5], ["9", 3]), advanced: extensions(["11", 4]) },
    V: { medium: extensions(["7", 6], ["9", 4]), advanced: extensions(["13", 6], ["7#9", 3]) },
    iii: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    bVII: { medium: extensions(["7", 5], ["9", 3]), advanced: extensions(["13", 4]) },
    v: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    II: { medium: extensions(["9", 5], ["7", 3]), advanced: extensions(["13", 4]) },
    vii: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    "vii:diminished": { medium: extensions(["dim", 4]), advanced: extensions(["dim7", 3]) },
    bIII: { medium: extensions(["maj7", 3]), advanced: extensions(["maj9", 2]) },
    i: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    bVI: { medium: extensions(["maj7", 3]), advanced: extensions(["13", 2]) },
    iv: { medium: extensions(["7", 4]), advanced: extensions(["11", 3]) },
    "#iv": { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
    VI: { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
    III: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    "#i": { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
    bII: { medium: extensions(["9", 3]), advanced: extensions(["13", 2]) },
  },
  minor: {
    i: { medium: extensions(["7", 7], ["9", 4]), advanced: extensions(["11", 7], ["13", 3], ["6/9", 2]) },
    bIII: { medium: extensions(["maj7", 4], ["9", 4]), advanced: extensions(["maj9", 3], ["13", 2]) },
    bVI: { medium: extensions(["maj7", 4]), advanced: extensions(["maj9", 3]) },
    iv: { medium: extensions(["7", 5], ["9", 3]), advanced: extensions(["11", 5]) },
    bVII: { medium: extensions(["7", 4], ["9", 3]), advanced: extensions(["13", 3]) },
    v: { medium: extensions(["7", 4]), advanced: extensions(["9", 3], ["11", 2]) },
    bII: { medium: extensions(["9", 4]), advanced: extensions(["13", 3], ["7#9", 1]) },
    bvii: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    IV: { medium: extensions(["9", 5]), advanced: extensions(["13", 5]) },
    ii: { medium: extensions(["7", 3]), advanced: extensions(["9", 2]) },
    "ii:diminished": { medium: extensions(["dim", 4]), advanced: extensions(["dim7", 3]) },
    bV: { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
    biii: { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
    bI: { medium: extensions(["maj7", 2]), advanced: extensions(["maj9", 1]) },
    bvi: { medium: extensions(["7", 3]), advanced: extensions(["11", 2]) },
    vi: { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
    I: { medium: extensions(["7", 2]), advanced: extensions(["13", 1]) },
    V: { medium: extensions(["7", 4]), advanced: extensions(["13", 3], ["7b9", 2]) },
    iii: { medium: extensions(["7", 2]), advanced: extensions(["9", 1]) },
  },
};

function fallbackExtensions(
  root: FunkRoot,
  complexity: "medium" | "advanced",
): ExtensionChoice[] {
  if (root.quality === "diminished") {
    return extensions([complexity === "medium" ? "dim" : "dim7", 1]);
  }
  if (root.quality === "minor") {
    return extensions([complexity === "medium" ? "7" : "9", 1]);
  }
  if (root.harmonicFunction === "dominant") {
    return extensions([complexity === "medium" ? "7" : "13", 1]);
  }
  return extensions([complexity === "medium" ? "maj7" : "maj9", 1]);
}

function curatedExtensions(
  root: FunkRoot,
  mode: Mode,
  complexity: "medium" | "advanced",
): ExtensionChoice[] {
  const key = root.quality === "diminished"
    ? `${root.romanRoot}:diminished`
    : root.romanRoot;
  return CURATED_EXTENSIONS[mode][key]?.[complexity] ??
    fallbackExtensions(root, complexity);
}

function definition(
  root: FunkRoot,
  mode: Mode,
  extension: ExtensionChoice,
  minimumComplexity: Complexity,
  allowedComplexities: Complexity[],
): ChordDefinition {
  return {
    roman: `${root.romanRoot}${extension.suffix}`,
    harmonicFunction: root.harmonicFunction,
    weight: root.weight * extension.weight,
    minimumComplexity,
    allowedComplexities,
    allowedModes: [mode],
    harmonicPool: root.harmonicPool,
    tags: root.tags,
  };
}

const chordVocabulary: ChordDefinition[] = (
  Object.entries(ROOTS_BY_MODE) as [Mode, FunkRoot[]][]
).flatMap(([mode, roots]) =>
  roots.flatMap((root) => [
    definition(
      root,
      mode,
      { suffix: root.quality === "diminished" ? "dim" : "", weight: 1 },
      "easy",
      ["easy"],
    ),
    ...curatedExtensions(root, mode, "medium").map((extension) =>
      definition(root, mode, extension, "medium", ["medium", "advanced"]),
    ),
    ...curatedExtensions(root, mode, "advanced").map((extension) =>
      definition(root, mode, extension, "advanced", ["advanced"]),
    ),
  ]),
);

chordVocabulary.push({
  roman: "V13/V",
  harmonicFunction: "dominant",
  weight: 6,
  minimumComplexity: "advanced",
  allowedComplexities: ["advanced"],
  allowedModes: ["major", "minor"],
  harmonicPool: "nearby",
  tags: ["must-resolve"],
});

function funkPattern(
  id: string,
  functions: HarmonicFunctionPattern["functions"],
  weight: number,
): HarmonicFunctionPattern {
  return {
    id,
    functions,
    weight,
    allowedSections: ["A"],
    allowedComplexities: ALL_COMPLEXITIES,
  };
}

const harmonicFunctionPatterns: HarmonicFunctionPattern[] = [
  funkPattern("one-chord-vamp", ["tonic"], 24),
  funkPattern("two-chord-tonic-color", ["tonic", "color"], 1),
  funkPattern("two-chord-tonic-subdominant", ["tonic", "predominant"], 14),
  funkPattern("two-chord-tonic-dominant", ["tonic", "dominant"], 10),
  funkPattern("four-chord-color-vamp", ["tonic", "color", "tonic", "color"], 1),
  funkPattern(
    "four-chord-subdominant-vamp",
    ["tonic", "predominant", "tonic", "predominant"],
    12,
  ),
  funkPattern(
    "four-chord-open-ending",
    ["tonic", "tonic", "color", "predominant"],
    2,
  ),
  funkPattern(
    "four-chord-functional-turnaround",
    ["tonic", "predominant", "dominant", "tonic"],
    8,
  ),
  funkPattern(
    "eight-chord-color-vamp",
    ["tonic", "tonic", "color", "tonic", "tonic", "color", "tonic", "color"],
    2,
  ),
  funkPattern(
    "eight-chord-subdominant-vamp",
    [
      "tonic",
      "tonic",
      "predominant",
      "tonic",
      "tonic",
      "predominant",
      "tonic",
      "predominant",
    ],
    10,
  ),
  funkPattern(
    "eight-chord-funk-turnaround",
    [
      "tonic",
      "tonic",
      "color",
      "tonic",
      "predominant",
      "dominant",
      "tonic",
      "color",
    ],
    6,
  ),
];

const harmonicChordPatterns: HarmonicChordPattern[] = [
  {
    id: "classic-dominant-vamp",
    romanChords: ["I9"],
    weight: 10,
    allowedSections: ["A"],
    allowedComplexities: ["medium"],
    allowedModes: ["major"],
  },
  {
    id: "classic-minor-vamp",
    romanChords: ["i7"],
    weight: 10,
    allowedSections: ["A"],
    allowedComplexities: ["medium"],
    allowedModes: ["minor"],
  },
  {
    id: "extended-dominant-vamp",
    romanChords: ["I13"],
    weight: 10,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["major"],
  },
  {
    id: "advanced-minor-7-vamp",
    romanChords: ["i7"],
    weight: 3,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "advanced-minor-9-vamp",
    romanChords: ["i9"],
    weight: 6,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "advanced-minor-11-vamp",
    romanChords: ["i11"],
    weight: 8,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "advanced-minor-13-vamp",
    romanChords: ["i13"],
    weight: 4,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "major-same-root-two-chord-medium",
    romanChords: ["I7", "I9"],
    weight: 12,
    allowedSections: ["A"],
    allowedComplexities: ["medium"],
    allowedModes: ["major"],
  },
  {
    id: "major-same-root-two-chord-advanced",
    romanChords: ["I9", "I13"],
    weight: 12,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["major"],
  },
  {
    id: "minor-same-root-two-chord-medium",
    romanChords: ["i7", "i9"],
    weight: 12,
    allowedSections: ["A"],
    allowedComplexities: ["medium"],
    allowedModes: ["minor"],
  },
  {
    id: "minor-same-root-two-chord-advanced",
    romanChords: ["i9", "i11"],
    weight: 12,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "minor-tonic-flat-three-nine-vamp",
    romanChords: ["i7", "bIII9"],
    weight: 10,
    allowedSections: ["A"],
    allowedComplexities: ["medium", "advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "minor-tonic-tritone-sub-vamp",
    romanChords: ["i9", "bII9"],
    weight: 12,
    allowedSections: ["A"],
    allowedComplexities: ["medium", "advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "dorian-two-chord-medium",
    romanChords: ["i7", "IV9"],
    weight: 7,
    allowedSections: ["A"],
    allowedComplexities: ["medium"],
    allowedModes: ["minor"],
  },
  {
    id: "dorian-two-chord-advanced",
    romanChords: ["i11", "IV13"],
    weight: 7,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "dorian-vamp-medium",
    romanChords: ["i7", "IV9", "i7", "IV9"],
    weight: 8,
    allowedSections: ["A"],
    allowedComplexities: ["medium"],
    allowedModes: ["minor"],
  },
  {
    id: "dorian-vamp-advanced",
    romanChords: ["i11", "IV13", "i11", "IV13"],
    weight: 8,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["minor"],
  },
  {
    id: "same-root-color-motion",
    romanChords: ["I13", "I13sus4", "I13", "I13sus4"],
    weight: 5,
    allowedSections: ["A"],
    allowedComplexities: ["advanced"],
    allowedModes: ["major"],
  },
];

export const funkStyleProfile = {
  id: "funk",
  name: "Funk",
  bpmRange: { min: 98, max: 118 },
  allowedMeters: [
    { value: "4/4", weight: 9 },
    { value: "3/4", weight: 1 },
  ],
  allowedModes: [
    { value: "major", weight: 6 },
    { value: "minor", weight: 4 },
  ],
  chordVocabulary,
  transitions: {
    tonic: [
      { value: "tonic", weight: 6 },
      { value: "color", weight: 5 },
      { value: "predominant", weight: 4 },
      { value: "dominant", weight: 1 },
    ],
    predominant: [
      { value: "tonic", weight: 6 },
      { value: "dominant", weight: 2 },
      { value: "color", weight: 2 },
    ],
    dominant: [
      { value: "tonic", weight: 7 },
      { value: "color", weight: 3 },
    ],
    color: [
      { value: "tonic", weight: 7 },
      { value: "predominant", weight: 2 },
      { value: "color", weight: 1 },
    ],
    passing: [
      { value: "tonic", weight: 5 },
      { value: "predominant", weight: 3 },
      { value: "dominant", weight: 2 },
    ],
  },
  harmonicFunctionPatterns,
  harmonicChordPatterns,
  genericHarmonyWeight: 5,
  maximumGeneratedNonCoreChords: 1,
  harmonicRhythms: [
    {
      value: {
        id: "four-bar-vamp",
        durationsBars: [4],
        minimumComplexity: "easy",
        allowedMeters: ["4/4", "3/4"],
        allowedSections: ["A", "B"],
      },
      weight: 18,
    },
    {
      value: {
        id: "two-bar-vamp",
        durationsBars: [2, 2],
        minimumComplexity: "easy",
        allowedMeters: ["4/4", "3/4"],
        allowedSections: ["A", "B"],
      },
      weight: 8,
    },
    {
      value: {
        id: "one-chord-per-bar",
        durationsBars: [1, 1, 1, 1],
        minimumComplexity: "easy",
        allowedMeters: ["4/4", "3/4"],
        allowedSections: ["A", "B"],
      },
      weight: 0.5,
    },
    {
      value: {
        id: "half-bar-push",
        durationsBars: [1, 0.5, 0.5, 2],
        minimumComplexity: "medium",
        allowedMeters: ["4/4"],
        allowedSections: ["B"],
      },
      weight: 0.5,
    },
    {
      value: {
        id: "half-bar-pickup",
        durationsBars: [0.5, 0.5, 1, 2],
        minimumComplexity: "medium",
        allowedMeters: ["4/4"],
        allowedSections: ["B"],
      },
      weight: 0.5,
    },
  ],
  sectionRules: {
    A: {
      bars: [
        { value: 4, weight: 4 },
        { value: 8, weight: 6 },
      ],
      allowedStartFunctions: [
        { value: "tonic", weight: 7 },
        { value: "color", weight: 2 },
        { value: "predominant", weight: 1 },
        { value: "dominant", weight: 0.5 },
      ],
      allowedEndFunctions: [
        { value: "tonic", weight: 5 },
        { value: "color", weight: 3 },
        { value: "predominant", weight: 2 },
        { value: "dominant", weight: 1 },
      ],
      tension: "medium",
      minimumDistinctFunctions: 1,
      requireLoopability: true,
    },
    B: {
      bars: [
        { value: 4, weight: 5 },
        { value: 8, weight: 5 },
      ],
      allowedStartFunctions: [
        { value: "predominant", weight: 6 },
        { value: "color", weight: 4 },
        { value: "tonic", weight: 2 },
        { value: "dominant", weight: 2 },
      ],
      allowedEndFunctions: [
        { value: "dominant", weight: 7 },
        { value: "tonic", weight: 3 },
        { value: "predominant", weight: 2 },
        { value: "color", weight: 1 },
      ],
      tension: "high",
      minimumDistinctFunctions: 1,
      requireLoopability: false,
    },
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
      nearby: 0.16,
      "chromatic-near": 0,
      "chromatic-medium": 0,
      "chromatic-far": 0,
    },
    adventurous: {
      core: 1,
      nearby: 0.14,
      "chromatic-near": 0.1,
      "chromatic-medium": 0.06,
      "chromatic-far": 0.02,
    },
  },
  validationRules: {
    maximumSameChordInSequence: 8,
    maximumGenerationAttempts: 20,
    maximumPassingDurationBars: 0.5,
    requireDifferentBFromA: true,
  },
} satisfies StyleProfile;
