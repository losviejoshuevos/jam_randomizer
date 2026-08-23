import type { HarmonicFunction, Mode, SectionLabel } from "@/lib/music/domain/types";
import type { GrooveArchetype, GrooveColorPalette, GroovePattern, GrooveStyleConfig } from "@/lib/music/groove/groove-style-types";
import { resolveGrooveStyleProfile, type GrooveRootDefinition } from "./groove-profile";

const MAJOR: Mode[] = ["major"];
const MINOR: Mode[] = ["minor"];
const BOTH: Mode[] = ["major", "minor"];
function p(id: string, roots: string[], functions: HarmonicFunction[], durations: number[], weight: number, modes: Mode[], sections: SectionLabel[], minimumFreedom: "strict" | "colorful" | "adventurous" = "strict", tags?: string[]): GroovePattern { return { id, roots, functions, durations, weight, modes, sections, minimumFreedom, tags }; }

const ENDINGS = [
  p("disco-ending-major", ["IV", "V", "I"], ["predominant", "dominant", "tonic"], [2, 2, 4], 24, MAJOR, ["D"], "strict", ["ending"]),
  p("disco-ending-minor", ["bVI", "bVII", "i"], ["predominant", "color", "tonic"], [2, 2, 4], 24, MINOR, ["D"], "strict", ["ending"]),
];

const CLASSIC = [
  p("classic-disco-minor-vamp", ["i", "iv"], ["tonic", "predominant"], [4, 4], 27, MINOR, ["A", "B"], "strict", ["hook"]),
  p("classic-disco-major-loop", ["I", "vi", "ii", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 24, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("classic-disco-major-rise", ["I", "iii", "IV", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 20, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("classic-disco-minor-release", ["bVI", "bVII", "i", "iv"], ["predominant", "color", "tonic", "predominant"], [2, 2, 2, 2], 18, MINOR, ["B", "C"], "strict", ["release"]),
  p("classic-disco-major-release", ["IV", "V", "iii", "vi"], ["predominant", "dominant", "tonic", "tonic"], [2, 2, 2, 2], 18, MAJOR, ["B", "C"], "strict", ["release"]),
  ...ENDINGS,
];

const DISCO_FUNK = [
  p("disco-funk-one", ["I"], ["tonic"], [8], 22, MAJOR, ["A"], "strict", ["hook"]),
  p("disco-funk-minor-one", ["i"], ["tonic"], [8], 24, MINOR, ["A"], "strict", ["hook"]),
  p("disco-funk-major-two", ["I", "bVII"], ["tonic", "color"], [4, 4], 24, MAJOR, ["A", "B"], "colorful", ["hook"]),
  p("disco-funk-minor-two", ["i", "IV"], ["tonic", "predominant"], [4, 4], 26, MINOR, ["A", "B"], "strict", ["hook"]),
  p("disco-funk-turn", ["IV", "iii", "VI", "ii", "V"], ["predominant", "tonic", "dominant", "predominant", "dominant"], [2, 1, 1, 2, 2], 16, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("disco-funk-minor-turn", ["bVI", "bVII", "i", "V"], ["predominant", "color", "tonic", "dominant"], [2, 2, 2, 2], 16, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...ENDINGS,
];

const ITALO = [
  p("italo-major", ["vi", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 27, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("italo-minor", ["i", "bVI", "bIII", "bVII"], ["tonic", "predominant", "tonic", "color"], [2, 2, 2, 2], 28, MINOR, ["A", "B"], "strict", ["hook"]),
  p("italo-major-lift", ["IV", "V", "vi", "iii"], ["predominant", "dominant", "tonic", "tonic"], [2, 2, 2, 2], 19, MAJOR, ["B", "C"], "strict", ["release"]),
  p("italo-minor-lift", ["bVI", "bVII", "i", "bIII"], ["predominant", "color", "tonic", "tonic"], [2, 2, 2, 2], 19, MINOR, ["B", "C"], "strict", ["release"]),
  ...ENDINGS,
];

const BOOGIE = [
  p("boogie-major", ["I", "IV"], ["tonic", "predominant"], [4, 4], 26, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("boogie-minor", ["i", "iv"], ["tonic", "predominant"], [4, 4], 27, MINOR, ["A", "B"], "strict", ["hook"]),
  p("boogie-major-cycle", ["I", "VI", "ii", "V"], ["tonic", "dominant", "predominant", "dominant"], [2, 2, 2, 2], 17, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("boogie-minor-cycle", ["i", "bIII", "iv", "V"], ["tonic", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 18, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...ENDINGS,
];

const NU_DISCO = [
  p("nu-disco-major", ["I", "V", "vi", "IV"], ["tonic", "dominant", "tonic", "predominant"], [2, 2, 2, 2], 25, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("nu-disco-minor", ["i", "bVII", "bVI", "iv"], ["tonic", "color", "predominant", "predominant"], [2, 2, 2, 2], 26, MINOR, ["A", "B"], "strict", ["hook"]),
  p("nu-disco-major-color", ["IV", "iv", "I", "VI"], ["predominant", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 14, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("nu-disco-chromatic", ["i", "bVII", "VI", "bVI"], ["tonic", "color", "dominant", "predominant"], [2, 2, 2, 2], 10, MINOR, ["C"], "adventurous", ["bridge"]),
  ...ENDINGS,
];

export const DISCO_ARCHETYPES: GrooveArchetype[] = [
  { id: "classic-70s", weight: 27, bpmRange: { min: 106, max: 126 }, bpmRanges: [{ value: { min: 112, max: 122 }, weight: 84 }, { value: { min: 106, max: 111 }, weight: 8 }, { value: { min: 123, max: 126 }, weight: 8 }], patterns: CLASSIC },
  { id: "disco-funk", weight: 24, bpmRange: { min: 102, max: 124 }, bpmRanges: [{ value: { min: 108, max: 120 }, weight: 84 }, { value: { min: 102, max: 107 }, weight: 8 }, { value: { min: 121, max: 124 }, weight: 8 }], patterns: DISCO_FUNK },
  { id: "italo-disco", weight: 16, bpmRange: { min: 112, max: 132 }, bpmRanges: [{ value: { min: 118, max: 128 }, weight: 84 }, { value: { min: 112, max: 117 }, weight: 8 }, { value: { min: 129, max: 132 }, weight: 8 }], patterns: ITALO },
  { id: "boogie-post-disco", weight: 18, bpmRange: { min: 98, max: 118 }, bpmRanges: [{ value: { min: 104, max: 114 }, weight: 84 }, { value: { min: 98, max: 103 }, weight: 8 }, { value: { min: 115, max: 118 }, weight: 8 }], patterns: BOOGIE },
  { id: "nu-disco", weight: 15, bpmRange: { min: 108, max: 126 }, bpmRanges: [{ value: { min: 114, max: 122 }, weight: 84 }, { value: { min: 108, max: 113 }, weight: 8 }, { value: { min: 123, max: 126 }, weight: 8 }], patterns: NU_DISCO },
];

export const DISCO_PALETTE: GrooveColorPalette = {
  medium: {
    "tonic-major": [{ value: "maj7", weight: 28 }, { value: "6", weight: 25 }, { value: "9", weight: 18 }, { value: "", weight: 29 }],
    "tonic-minor": [{ value: "7", weight: 45 }, { value: "9", weight: 24 }, { value: "", weight: 31 }],
    dominant: [{ value: "7", weight: 38 }, { value: "9", weight: 32 }, { value: "13", weight: 18 }, { value: "", weight: 12 }],
    major: [{ value: "maj7", weight: 25 }, { value: "6", weight: 24 }, { value: "9", weight: 18 }, { value: "", weight: 33 }],
    minor: [{ value: "7", weight: 46 }, { value: "9", weight: 22 }, { value: "", weight: 32 }],
    suspended: [{ value: "7sus4", weight: 48 }, { value: "9sus4", weight: 32 }, { value: "sus4", weight: 20 }],
  },
  advanced: {
    "tonic-major": [{ value: "maj9", weight: 25 }, { value: "6/9", weight: 24 }, { value: "maj7", weight: 20 }, { value: "9", weight: 16 }, { value: "", weight: 15 }],
    "tonic-minor": [{ value: "9", weight: 32 }, { value: "11", weight: 22 }, { value: "7", weight: 30 }, { value: "", weight: 16 }],
    dominant: [{ value: "13", weight: 34 }, { value: "9", weight: 30 }, { value: "7", weight: 20 }, { value: "13sus4", weight: 10 }, { value: "", weight: 6 }],
    major: [{ value: "maj9", weight: 24 }, { value: "6/9", weight: 22 }, { value: "maj7", weight: 20 }, { value: "9", weight: 16 }, { value: "", weight: 18 }],
    minor: [{ value: "9", weight: 32 }, { value: "11", weight: 20 }, { value: "7", weight: 30 }, { value: "", weight: 18 }],
    suspended: [{ value: "13sus4", weight: 40 }, { value: "9sus4", weight: 38 }, { value: "7sus4", weight: 22 }],
  },
};

const ROOTS: GrooveRootDefinition[] = [
  { root: "I", harmonicFunction: "tonic", modes: MAJOR, pool: "core" }, { root: "i", harmonicFunction: "tonic", modes: MINOR, pool: "core" },
  { root: "ii", harmonicFunction: "predominant", modes: MAJOR, pool: "core" }, { root: "iii", harmonicFunction: "tonic", modes: MAJOR, pool: "core" },
  { root: "IV", harmonicFunction: "predominant", modes: MAJOR, pool: "core" }, { root: "iv", harmonicFunction: "predominant", modes: MINOR, pool: "core" },
  { root: "V", harmonicFunction: "dominant", modes: BOTH, pool: "core" }, { root: "vi", harmonicFunction: "tonic", modes: MAJOR, pool: "core" },
  { root: "bIII", harmonicFunction: "tonic", modes: MINOR, pool: "core" }, { root: "bVI", harmonicFunction: "predominant", modes: MINOR, pool: "core" },
  { root: "bVII", harmonicFunction: "color", modes: MINOR, pool: "core" }, { root: "bVII", harmonicFunction: "color", modes: MAJOR, pool: "nearby" },
  { root: "iv", harmonicFunction: "predominant", modes: MAJOR, pool: "nearby" }, { root: "VI", harmonicFunction: "dominant", modes: BOTH, pool: "nearby" },
];

export function discoArchetype(id: string) { return DISCO_ARCHETYPES.find((item) => item.id === id) ?? DISCO_ARCHETYPES[0]; }
export const discoGrooveConfig: GrooveStyleConfig = { styleId: "disco", defaultArchetypeId: "classic-70s", archetype: discoArchetype, palette: DISCO_PALETTE };
export function resolveDiscoStyleProfile(seed: string, requestedArchetypeId?: string) { return resolveGrooveStyleProfile({ styleId: "disco", name: "Disco", generatorKind: "disco", seed, requestedArchetypeId, archetypes: DISCO_ARCHETYPES, palette: DISCO_PALETTE, roots: ROOTS, allowedModes: [{ value: "minor", weight: 52 }, { value: "major", weight: 48 }], allowedMeters: [{ value: "4/4", weight: 100 }] }); }
export const discoStyleDescriptor = { id: "disco", name: "Disco", bpmRange: { min: 98, max: 132 } } as const;
