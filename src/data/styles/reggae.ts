import type { HarmonicFunction, Mode, SectionLabel } from "@/lib/music/domain/types";
import type { GrooveArchetype, GrooveColorPalette, GroovePattern, GrooveStyleConfig } from "@/lib/music/groove/groove-style-types";
import { resolveGrooveStyleProfile, type GrooveRootDefinition } from "./groove-profile";

const MAJOR: Mode[] = ["major"];
const MINOR: Mode[] = ["minor"];
const BOTH: Mode[] = ["major", "minor"];
function p(id: string, roots: string[], functions: HarmonicFunction[], durations: number[], weight: number, modes: Mode[], sections: SectionLabel[], minimumFreedom: "strict" | "colorful" | "adventurous" = "strict", tags?: string[]): GroovePattern { return { id, roots, functions, durations, weight, modes, sections, minimumFreedom, tags }; }

const ROOTS_PATTERNS = [
  p("roots-major-one-drop", ["I", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 24, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("roots-minor-one-drop", ["i", "bVII", "bVI", "bVII"], ["tonic", "color", "predominant", "color"], [2, 2, 2, 2], 25, MINOR, ["A", "B"], "strict", ["hook"]),
  p("roots-major-cycle", ["I", "vi", "IV", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 18, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("roots-minor-release", ["bIII", "bVII", "i", "bVI"], ["tonic", "color", "tonic", "predominant"], [2, 2, 2, 2], 18, MINOR, ["B", "C"], "strict", ["release"]),
  p("roots-major-bridge", ["vi", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 18, MAJOR, ["C"], "strict", ["bridge"]),
  p("roots-ending-major", ["IV", "V", "I"], ["predominant", "dominant", "tonic"], [2, 2, 4], 22, MAJOR, ["D"], "strict", ["ending"]),
  p("roots-ending-minor", ["bVI", "bVII", "i"], ["predominant", "color", "tonic"], [2, 2, 4], 22, MINOR, ["D"], "strict", ["ending"]),
];

const ONE_DROP = [
  p("one-drop-major-vamp", ["I", "IV"], ["tonic", "predominant"], [4, 4], 27, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("one-drop-minor-vamp", ["i", "iv"], ["tonic", "predominant"], [4, 4], 27, MINOR, ["A", "B"], "strict", ["hook"]),
  p("one-drop-major-answer", ["IV", "I", "V", "I"], ["predominant", "tonic", "dominant", "tonic"], [2, 2, 2, 2], 18, MAJOR, ["B", "C"], "strict", ["release"]),
  p("one-drop-minor-answer", ["bVI", "bVII", "i"], ["predominant", "color", "tonic"], [2, 2, 4], 18, MINOR, ["B", "C"], "strict", ["release"]),
  ...ROOTS_PATTERNS.filter(({ sections }) => sections.includes("D")),
];

const ROCKSTEADY = [
  p("rocksteady-major", ["I", "vi", "ii", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 26, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("rocksteady-minor", ["i", "iv", "bIII", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 24, MINOR, ["A", "B"], "strict", ["hook"]),
  p("rocksteady-doo-wop", ["I", "vi", "IV", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 22, MAJOR, ["A", "B", "C"], "strict", ["release"]),
  p("rocksteady-minor-bridge", ["bIII", "bVI", "iv", "V"], ["tonic", "predominant", "predominant", "dominant"], [2, 2, 2, 2], 18, MINOR, ["C"], "strict", ["bridge"]),
  ...ROOTS_PATTERNS.filter(({ sections }) => sections.includes("D")),
];

const DUB = [
  p("dub-minor-one", ["i"], ["tonic"], [8], 30, MINOR, ["A"], "strict", ["hook"]),
  p("dub-major-one", ["I"], ["tonic"], [8], 25, MAJOR, ["A"], "strict", ["hook"]),
  p("dub-minor-two", ["i", "bVII"], ["tonic", "color"], [4, 4], 27, MINOR, ["A", "B"], "strict", ["hook"]),
  p("dub-major-two", ["I", "bVII"], ["tonic", "color"], [4, 4], 22, MAJOR, ["A", "B"], "colorful", ["hook"]),
  p("dub-space-major", ["IV", "I"], ["predominant", "tonic"], [4, 4], 18, MAJOR, ["B", "C"], "strict", ["bridge"]),
  p("dub-space-minor", ["bVI", "i"], ["predominant", "tonic"], [4, 4], 18, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...ROOTS_PATTERNS.filter(({ sections }) => sections.includes("D")),
];

const REGGAE_ROCK = [
  p("reggae-rock-major", ["I", "V", "vi", "IV"], ["tonic", "dominant", "tonic", "predominant"], [2, 2, 2, 2], 26, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("reggae-rock-minor", ["i", "bVII", "bVI", "bVII"], ["tonic", "color", "predominant", "color"], [2, 2, 2, 2], 26, MINOR, ["A", "B"], "strict", ["hook"]),
  p("reggae-rock-lift", ["IV", "V", "vi", "I"], ["predominant", "dominant", "tonic", "tonic"], [2, 2, 2, 2], 20, MAJOR, ["B", "C"], "strict", ["release"]),
  p("reggae-rock-minor-lift", ["bVI", "bIII", "bVII", "i"], ["predominant", "tonic", "color", "tonic"], [2, 2, 2, 2], 20, MINOR, ["B", "C"], "strict", ["release"]),
  ...ROOTS_PATTERNS.filter(({ sections }) => sections.includes("D")),
];

const SKA = [
  p("ska-major", ["I", "IV", "V", "IV"], ["tonic", "predominant", "dominant", "predominant"], [2, 2, 2, 2], 28, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("ska-minor", ["i", "bIII", "bVII", "iv"], ["tonic", "tonic", "color", "predominant"], [2, 2, 2, 2], 24, MINOR, ["A", "B"], "strict", ["hook"]),
  p("ska-turnaround", ["I", "VI", "ii", "V"], ["tonic", "dominant", "predominant", "dominant"], [1, 1, 1, 1], 17, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("ska-minor-turn", ["bIII", "bVI", "iv", "V"], ["tonic", "predominant", "predominant", "dominant"], [1, 1, 1, 1], 17, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...ROOTS_PATTERNS.filter(({ sections }) => sections.includes("D")),
];

export const REGGAE_ARCHETYPES: GrooveArchetype[] = [
  { id: "roots-reggae", weight: 25, bpmRange: { min: 70, max: 106 }, bpmRanges: [{ value: { min: 76, max: 96 }, weight: 84 }, { value: { min: 70, max: 75 }, weight: 8 }, { value: { min: 97, max: 106 }, weight: 8 }], patterns: ROOTS_PATTERNS },
  { id: "one-drop", weight: 20, bpmRange: { min: 66, max: 98 }, bpmRanges: [{ value: { min: 72, max: 90 }, weight: 86 }, { value: { min: 66, max: 71 }, weight: 7 }, { value: { min: 91, max: 98 }, weight: 7 }], patterns: ONE_DROP },
  { id: "rocksteady", weight: 16, bpmRange: { min: 72, max: 112 }, bpmRanges: [{ value: { min: 80, max: 102 }, weight: 84 }, { value: { min: 72, max: 79 }, weight: 8 }, { value: { min: 103, max: 112 }, weight: 8 }], patterns: ROCKSTEADY },
  { id: "dub-vamp", weight: 16, bpmRange: { min: 62, max: 96 }, bpmRanges: [{ value: { min: 68, max: 88 }, weight: 86 }, { value: { min: 62, max: 67 }, weight: 7 }, { value: { min: 89, max: 96 }, weight: 7 }], patterns: DUB },
  { id: "reggae-rock", weight: 13, bpmRange: { min: 82, max: 124 }, bpmRanges: [{ value: { min: 90, max: 114 }, weight: 84 }, { value: { min: 82, max: 89 }, weight: 8 }, { value: { min: 115, max: 124 }, weight: 8 }], patterns: REGGAE_ROCK },
  { id: "ska", weight: 10, bpmRange: { min: 118, max: 184 }, bpmRanges: [{ value: { min: 136, max: 168 }, weight: 82 }, { value: { min: 118, max: 135 }, weight: 9 }, { value: { min: 169, max: 184 }, weight: 9 }], patterns: SKA },
];

export const REGGAE_PALETTE: GrooveColorPalette = {
  medium: {
    "tonic-major": [{ value: "", weight: 38 }, { value: "6", weight: 24 }, { value: "7", weight: 18 }, { value: "add9", weight: 20 }],
    "tonic-minor": [{ value: "", weight: 40 }, { value: "7", weight: 38 }, { value: "9", weight: 12 }, { value: "add9", weight: 10 }],
    dominant: [{ value: "7", weight: 54 }, { value: "9", weight: 20 }, { value: "sus4", weight: 12 }, { value: "", weight: 14 }],
    major: [{ value: "", weight: 48 }, { value: "6", weight: 20 }, { value: "7", weight: 16 }, { value: "add9", weight: 16 }],
    minor: [{ value: "", weight: 44 }, { value: "7", weight: 38 }, { value: "9", weight: 10 }, { value: "add9", weight: 8 }],
    suspended: [{ value: "sus4", weight: 62 }, { value: "7sus4", weight: 28 }, { value: "", weight: 10 }],
  },
  advanced: {
    "tonic-major": [{ value: "6", weight: 28 }, { value: "maj7", weight: 20 }, { value: "9", weight: 16 }, { value: "add9", weight: 20 }, { value: "", weight: 16 }],
    "tonic-minor": [{ value: "7", weight: 36 }, { value: "9", weight: 26 }, { value: "11", weight: 14 }, { value: "", weight: 24 }],
    dominant: [{ value: "9", weight: 30 }, { value: "13", weight: 20 }, { value: "7", weight: 28 }, { value: "9sus4", weight: 12 }, { value: "", weight: 10 }],
    major: [{ value: "6", weight: 25 }, { value: "maj7", weight: 20 }, { value: "9", weight: 15 }, { value: "add9", weight: 20 }, { value: "", weight: 20 }],
    minor: [{ value: "7", weight: 36 }, { value: "9", weight: 24 }, { value: "11", weight: 12 }, { value: "", weight: 28 }],
    suspended: [{ value: "9sus4", weight: 42 }, { value: "7sus4", weight: 38 }, { value: "sus4", weight: 20 }],
  },
};

const ROOTS: GrooveRootDefinition[] = [
  { root: "I", harmonicFunction: "tonic", modes: MAJOR, pool: "core" }, { root: "i", harmonicFunction: "tonic", modes: MINOR, pool: "core" },
  { root: "ii", harmonicFunction: "predominant", modes: MAJOR, pool: "core" }, { root: "IV", harmonicFunction: "predominant", modes: MAJOR, pool: "core" },
  { root: "iv", harmonicFunction: "predominant", modes: MINOR, pool: "core" }, { root: "V", harmonicFunction: "dominant", modes: BOTH, pool: "core" },
  { root: "vi", harmonicFunction: "tonic", modes: MAJOR, pool: "core" }, { root: "bIII", harmonicFunction: "tonic", modes: MINOR, pool: "core" },
  { root: "bVI", harmonicFunction: "predominant", modes: MINOR, pool: "core" }, { root: "bVII", harmonicFunction: "color", modes: MINOR, pool: "core" },
  { root: "bVII", harmonicFunction: "color", modes: MAJOR, pool: "nearby" }, { root: "VI", harmonicFunction: "dominant", modes: BOTH, pool: "nearby" },
];

export function reggaeArchetype(id: string) { return REGGAE_ARCHETYPES.find((item) => item.id === id) ?? REGGAE_ARCHETYPES[0]; }
export const reggaeGrooveConfig: GrooveStyleConfig = { styleId: "reggae", defaultArchetypeId: "roots-reggae", archetype: reggaeArchetype, palette: REGGAE_PALETTE };
export function resolveReggaeStyleProfile(seed: string, requestedArchetypeId?: string) { return resolveGrooveStyleProfile({ styleId: "reggae", name: "Reggae / Dub", generatorKind: "reggae", seed, requestedArchetypeId, archetypes: REGGAE_ARCHETYPES, palette: REGGAE_PALETTE, roots: ROOTS, allowedModes: [{ value: "minor", weight: 54 }, { value: "major", weight: 46 }] }); }
export const reggaeStyleDescriptor = { id: "reggae", name: "Reggae / Dub", bpmRange: { min: 62, max: 184 } } as const;
