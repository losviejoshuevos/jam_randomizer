import type { HarmonicFunction, Mode, SectionLabel } from "@/lib/music/domain/types";
import type { GrooveArchetype, GrooveColorPalette, GroovePattern, GrooveStyleConfig } from "@/lib/music/groove/groove-style-types";
import { resolveGrooveStyleProfile, type GrooveRootDefinition } from "./groove-profile";

const MAJOR: Mode[] = ["major"];
const MINOR: Mode[] = ["minor"];
const BOTH: Mode[] = ["major", "minor"];

function p(id: string, roots: string[], functions: HarmonicFunction[], durations: number[], weight: number, modes: Mode[], sections: SectionLabel[], minimumFreedom: "strict" | "colorful" | "adventurous" = "strict", tags?: string[]): GroovePattern {
  return { id, roots, functions, durations, weight, modes, sections, minimumFreedom, tags };
}

const VAMP = [
  p("neo-minor-two-state", ["i", "iv"], ["tonic", "predominant"], [4, 4], 26, MINOR, ["A", "B"], "strict", ["hook"]),
  p("neo-major-two-state", ["I", "vi"], ["tonic", "tonic"], [4, 4], 23, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("neo-step-loop-major", ["IV", "iii", "ii", "I"], ["predominant", "tonic", "predominant", "tonic"], [2, 2, 2, 2], 18, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("neo-step-loop-minor", ["iv", "bIII", "bVI", "V"], ["predominant", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 17, MINOR, ["B", "C"], "strict", ["release"]),
  p("neo-backdoor", ["I", "iv", "bVII", "I"], ["tonic", "predominant", "color", "tonic"], [2, 2, 2, 2], 12, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("neo-ending", ["ii", "bII", "I"], ["predominant", "dominant", "tonic"], [2, 2, 4], 16, MAJOR, ["D"], "adventurous", ["ending"]),
  p("neo-ending-minor", ["bVI", "V", "i"], ["predominant", "dominant", "tonic"], [2, 2, 4], 20, MINOR, ["D"], "strict", ["ending"]),
];

const NINETIES = [
  p("rnb-90-major", ["I", "iii", "IV", "iv"], ["tonic", "tonic", "predominant", "predominant"], [2, 2, 2, 2], 23, MAJOR, ["A", "B"], "colorful", ["hook"]),
  p("rnb-90-minor", ["i", "bVI", "iv", "V"], ["tonic", "predominant", "predominant", "dominant"], [2, 2, 2, 2], 24, MINOR, ["A", "B"], "strict", ["hook"]),
  p("rnb-90-release-major", ["vi", "ii", "IV", "V"], ["tonic", "predominant", "predominant", "dominant"], [2, 2, 2, 2], 18, MAJOR, ["B", "C"], "strict", ["release"]),
  p("rnb-90-release-minor", ["bIII", "bVII", "iv", "V"], ["tonic", "color", "predominant", "dominant"], [2, 2, 2, 2], 18, MINOR, ["B", "C"], "strict", ["release"]),
  ...VAMP.filter(({ sections }) => sections.includes("D")),
];

const QUIET_STORM = [
  p("quiet-major", ["I", "vi", "ii", "V"], ["tonic", "tonic", "predominant", "dominant"], [4, 4, 4, 4], 25, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("quiet-minor", ["i", "iv", "bVI", "V"], ["tonic", "predominant", "predominant", "dominant"], [4, 4, 4, 4], 25, MINOR, ["A", "B"], "strict", ["hook"]),
  p("quiet-major-lift", ["IV", "iii", "vi", "ii", "V"], ["predominant", "tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 1, 1], 18, MAJOR, ["B", "C"], "strict", ["bridge"]),
  p("quiet-minor-lift", ["bVI", "bVII", "bIII", "iv", "V"], ["predominant", "color", "tonic", "predominant", "dominant"], [2, 2, 2, 1, 1], 18, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...VAMP.filter(({ sections }) => sections.includes("D")),
];

const HIP_HOP_SOUL = [
  p("hiphop-minor-one", ["i"], ["tonic"], [8], 24, MINOR, ["A"], "strict", ["hook"]),
  p("hiphop-minor-loop", ["i", "bVI"], ["tonic", "predominant"], [4, 4], 24, MINOR, ["A", "B"], "strict", ["hook"]),
  p("hiphop-major-loop", ["I", "IV"], ["tonic", "predominant"], [4, 4], 22, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("hiphop-color", ["i", "bII", "i", "bVI"], ["tonic", "color", "tonic", "predominant"], [2, 2, 2, 2], 14, MINOR, ["B", "C"], "adventurous", ["bridge"]),
  ...VAMP.filter(({ sections }) => sections.includes("D")),
];

const GOSPEL_RNB = [
  p("gospel-major-walk", ["I", "iii", "IV", "iv", "I"], ["tonic", "tonic", "predominant", "predominant", "tonic"], [2, 1, 1, 2, 2], 24, MAJOR, ["A", "B"], "colorful", ["hook"]),
  p("gospel-minor-rise", ["i", "bIII", "iv", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 22, MINOR, ["A", "B"], "strict", ["hook"]),
  p("gospel-cycle", ["iii", "VI", "ii", "V", "I"], ["tonic", "dominant", "predominant", "dominant", "tonic"], [1, 1, 2, 2, 2], 18, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("gospel-backdoor", ["IV", "iv", "bVII", "I"], ["predominant", "predominant", "color", "tonic"], [2, 2, 2, 2], 16, MAJOR, ["C"], "colorful", ["bridge"]),
  ...VAMP.filter(({ sections }) => sections.includes("D")),
];

const CONTEMPORARY = [
  p("modern-rnb-major", ["vi", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 24, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("modern-rnb-minor", ["i", "bVI", "bIII", "bVII"], ["tonic", "predominant", "tonic", "color"], [2, 2, 2, 2], 25, MINOR, ["A", "B"], "strict", ["hook"]),
  p("modern-rnb-open", ["I", "V", "vi", "IV"], ["tonic", "dominant", "tonic", "predominant"], [2, 2, 2, 2], 18, MAJOR, ["B", "C"], "strict", ["release"]),
  p("modern-rnb-chromatic", ["i", "bIII", "II", "bII"], ["tonic", "tonic", "dominant", "dominant"], [2, 2, 2, 2], 10, MINOR, ["C"], "adventurous", ["bridge"]),
  ...VAMP.filter(({ sections }) => sections.includes("D")),
];

export const NEO_SOUL_ARCHETYPES: GrooveArchetype[] = [
  { id: "neo-soul-vamp", weight: 25, bpmRange: { min: 64, max: 102 }, bpmRanges: [{ value: { min: 72, max: 94 }, weight: 82 }, { value: { min: 64, max: 71 }, weight: 8 }, { value: { min: 95, max: 102 }, weight: 10 }], patterns: VAMP },
  { id: "nineties-rnb", weight: 18, bpmRange: { min: 68, max: 108 }, bpmRanges: [{ value: { min: 76, max: 98 }, weight: 82 }, { value: { min: 68, max: 75 }, weight: 8 }, { value: { min: 99, max: 108 }, weight: 10 }], patterns: NINETIES },
  { id: "quiet-storm", weight: 14, bpmRange: { min: 56, max: 88 }, bpmRanges: [{ value: { min: 62, max: 80 }, weight: 84 }, { value: { min: 56, max: 61 }, weight: 8 }, { value: { min: 81, max: 88 }, weight: 8 }], patterns: QUIET_STORM },
  { id: "hip-hop-soul", weight: 16, bpmRange: { min: 66, max: 98 }, bpmRanges: [{ value: { min: 72, max: 90 }, weight: 84 }, { value: { min: 66, max: 71 }, weight: 8 }, { value: { min: 91, max: 98 }, weight: 8 }], patterns: HIP_HOP_SOUL },
  { id: "gospel-rnb", weight: 14, bpmRange: { min: 68, max: 116 }, bpmRanges: [{ value: { min: 78, max: 104 }, weight: 80 }, { value: { min: 68, max: 77 }, weight: 10 }, { value: { min: 105, max: 116 }, weight: 10 }], patterns: GOSPEL_RNB },
  { id: "contemporary-rnb", weight: 13, bpmRange: { min: 66, max: 112 }, bpmRanges: [{ value: { min: 74, max: 100 }, weight: 82 }, { value: { min: 66, max: 73 }, weight: 8 }, { value: { min: 101, max: 112 }, weight: 10 }], patterns: CONTEMPORARY },
];

export const NEO_SOUL_PALETTE: GrooveColorPalette = {
  medium: {
    "tonic-major": [{ value: "maj7", weight: 32 }, { value: "maj9", weight: 25 }, { value: "6/9", weight: 18 }, { value: "6", weight: 10 }, { value: "", weight: 15 }],
    "tonic-minor": [{ value: "7", weight: 35 }, { value: "9", weight: 35 }, { value: "11", weight: 15 }, { value: "", weight: 15 }],
    dominant: [{ value: "9", weight: 38 }, { value: "13", weight: 22 }, { value: "7sus4", weight: 18 }, { value: "7", weight: 17 }, { value: "", weight: 5 }],
    major: [{ value: "maj7", weight: 34 }, { value: "maj9", weight: 26 }, { value: "6/9", weight: 15 }, { value: "", weight: 25 }],
    minor: [{ value: "7", weight: 36 }, { value: "9", weight: 34 }, { value: "11", weight: 15 }, { value: "", weight: 15 }],
    suspended: [{ value: "9sus4", weight: 45 }, { value: "7sus4", weight: 35 }, { value: "sus4", weight: 20 }],
  },
  advanced: {
    "tonic-major": [{ value: "maj9", weight: 32 }, { value: "6/9", weight: 26 }, { value: "maj7#11", weight: 12 }, { value: "maj7", weight: 18 }, { value: "", weight: 12 }],
    "tonic-minor": [{ value: "9", weight: 34 }, { value: "11", weight: 30 }, { value: "7", weight: 20 }, { value: "maj7", weight: 6 }, { value: "", weight: 10 }],
    dominant: [{ value: "13sus4", weight: 24 }, { value: "13", weight: 22 }, { value: "9", weight: 20 }, { value: "7alt", weight: 10 }, { value: "7#9", weight: 8 }, { value: "7b9", weight: 8 }, { value: "7", weight: 8 }],
    major: [{ value: "maj9", weight: 30 }, { value: "maj7#11", weight: 22 }, { value: "6/9", weight: 20 }, { value: "maj7", weight: 18 }, { value: "", weight: 10 }],
    minor: [{ value: "9", weight: 34 }, { value: "11", weight: 30 }, { value: "7", weight: 22 }, { value: "", weight: 14 }],
    suspended: [{ value: "13sus4", weight: 42 }, { value: "9sus4", weight: 36 }, { value: "7sus4", weight: 22 }],
  },
};

const ROOTS: GrooveRootDefinition[] = [
  { root: "I", harmonicFunction: "tonic", modes: MAJOR, pool: "core" }, { root: "i", harmonicFunction: "tonic", modes: MINOR, pool: "core" },
  { root: "ii", harmonicFunction: "predominant", modes: MAJOR, pool: "core" }, { root: "iii", harmonicFunction: "tonic", modes: MAJOR, pool: "core" },
  { root: "IV", harmonicFunction: "predominant", modes: BOTH, pool: "core" }, { root: "iv", harmonicFunction: "predominant", modes: MINOR, pool: "core" },
  { root: "V", harmonicFunction: "dominant", modes: BOTH, pool: "core" }, { root: "vi", harmonicFunction: "tonic", modes: MAJOR, pool: "core" },
  { root: "bIII", harmonicFunction: "tonic", modes: MINOR, pool: "core" }, { root: "bVI", harmonicFunction: "predominant", modes: MINOR, pool: "core" },
  { root: "bVII", harmonicFunction: "color", modes: BOTH, pool: "nearby" }, { root: "iv", harmonicFunction: "predominant", modes: MAJOR, pool: "nearby" },
  { root: "II", harmonicFunction: "dominant", modes: BOTH, pool: "nearby" }, { root: "VI", harmonicFunction: "dominant", modes: BOTH, pool: "nearby" },
  { root: "bII", harmonicFunction: "dominant", modes: BOTH, pool: "chromatic-near" },
];

export function neoSoulArchetype(id: string): GrooveArchetype {
  return NEO_SOUL_ARCHETYPES.find((item) => item.id === id) ?? NEO_SOUL_ARCHETYPES[0];
}

export const neoSoulGrooveConfig: GrooveStyleConfig = { styleId: "neo-soul", defaultArchetypeId: "neo-soul-vamp", archetype: neoSoulArchetype, palette: NEO_SOUL_PALETTE };

export function resolveNeoSoulStyleProfile(seed: string, requestedArchetypeId?: string) {
  return resolveGrooveStyleProfile({ styleId: "neo-soul", name: "Neo-Soul / R&B", generatorKind: "neo-soul", seed, requestedArchetypeId, archetypes: NEO_SOUL_ARCHETYPES, palette: NEO_SOUL_PALETTE, roots: ROOTS, allowedModes: [{ value: "minor", weight: 56 }, { value: "major", weight: 44 }] });
}

export const neoSoulStyleDescriptor = { id: "neo-soul", name: "Neo-Soul / R&B", bpmRange: { min: 56, max: 116 } } as const;
