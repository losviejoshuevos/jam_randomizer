import type { HarmonicFunction, Meter, Mode, SectionLabel } from "@/lib/music/domain/types";
import type { GrooveArchetype, GrooveColorPalette, GroovePattern, GrooveStyleConfig } from "@/lib/music/groove/groove-style-types";
import { resolveGrooveStyleProfile, type GrooveRootDefinition } from "./groove-profile";

const MAJOR: Mode[] = ["major"];
const MINOR: Mode[] = ["minor"];
const BOTH: Mode[] = ["major", "minor"];
function p(id: string, roots: string[], functions: HarmonicFunction[], durations: number[], weight: number, modes: Mode[], sections: SectionLabel[], minimumFreedom: "strict" | "colorful" | "adventurous" = "strict", tags?: string[], allowedMeters?: Meter[]): GroovePattern { return { id, roots, functions, durations, weight, modes, sections, minimumFreedom, tags, allowedMeters }; }

const ENDINGS = [
  p("country-ending-major", ["IV", "V", "I"], ["predominant", "dominant", "tonic"], [1, 1, 2], 26, MAJOR, ["D"], "strict", ["ending"]),
  p("country-ending-minor", ["iv", "V", "i"], ["predominant", "dominant", "tonic"], [1, 1, 2], 24, MINOR, ["D"], "strict", ["ending"]),
];

const HONKY_TONK = [
  p("honky-tonk-major", ["I", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 28, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("honky-tonk-minor", ["i", "iv", "i", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 24, MINOR, ["A", "B"], "strict", ["hook"]),
  p("honky-tonk-walk", ["I", "VI", "II", "V"], ["tonic", "dominant", "dominant", "dominant"], [2, 2, 2, 2], 16, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  p("honky-tonk-release", ["IV", "I", "V", "I"], ["predominant", "tonic", "dominant", "tonic"], [2, 2, 2, 2], 20, MAJOR, ["B", "C"], "strict", ["release"]),
  ...ENDINGS,
];

const BAKERSFIELD = [
  p("bakersfield-major", ["I", "V", "IV", "I"], ["tonic", "dominant", "predominant", "tonic"], [2, 2, 2, 2], 28, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("bakersfield-two", ["I", "IV"], ["tonic", "predominant"], [4, 4], 22, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("bakersfield-minor", ["i", "bVII", "iv", "V"], ["tonic", "color", "predominant", "dominant"], [2, 2, 2, 2], 22, MINOR, ["A", "B"], "strict", ["hook"]),
  p("bakersfield-bridge", ["IV", "I", "II", "V"], ["predominant", "tonic", "dominant", "dominant"], [2, 2, 2, 2], 17, MAJOR, ["B", "C"], "colorful", ["bridge"]),
  ...ENDINGS,
];

const OUTLAW = [
  p("outlaw-major", ["I", "bVII", "IV", "I"], ["tonic", "color", "predominant", "tonic"], [2, 2, 2, 2], 26, MAJOR, ["A", "B"], "colorful", ["hook"]),
  p("outlaw-minor", ["i", "bVII", "bVI", "i"], ["tonic", "color", "predominant", "tonic"], [2, 2, 2, 2], 26, MINOR, ["A", "B"], "strict", ["hook"]),
  p("outlaw-major-train", ["I", "IV", "I", "V", "IV", "I"], ["tonic", "predominant", "tonic", "dominant", "predominant", "tonic"], [2, 1, 1, 2, 1, 1], 20, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("outlaw-bridge", ["vi", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 18, MAJOR, ["B", "C"], "strict", ["bridge"]),
  ...ENDINGS,
];

const AMERICANA = [
  p("americana-major", ["I", "V", "vi", "IV"], ["tonic", "dominant", "tonic", "predominant"], [2, 2, 2, 2], 25, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("americana-folk", ["I", "IV", "vi", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 24, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("americana-minor", ["i", "bIII", "bVII", "iv"], ["tonic", "tonic", "color", "predominant"], [2, 2, 2, 2], 24, MINOR, ["A", "B"], "strict", ["hook"]),
  p("americana-bridge", ["vi", "iii", "IV", "I", "V"], ["tonic", "tonic", "predominant", "tonic", "dominant"], [2, 1, 1, 2, 2], 18, MAJOR, ["B", "C"], "strict", ["bridge"]),
  p("americana-minor-bridge", ["bVI", "bIII", "bVII", "V"], ["predominant", "tonic", "color", "dominant"], [2, 2, 2, 2], 18, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...ENDINGS,
];

const SOUTHERN = [
  p("southern-major", ["I", "bVII", "IV", "I"], ["tonic", "color", "predominant", "tonic"], [2, 2, 2, 2], 28, MAJOR, ["A", "B"], "colorful", ["hook"]),
  p("southern-minor", ["i", "bVII", "bVI", "bVII"], ["tonic", "color", "predominant", "color"], [2, 2, 2, 2], 27, MINOR, ["A", "B"], "strict", ["hook"]),
  p("southern-major-lift", ["IV", "I", "V", "bVII"], ["predominant", "tonic", "dominant", "color"], [2, 2, 2, 2], 18, MAJOR, ["B", "C"], "colorful", ["release"]),
  p("southern-chromatic", ["I", "bIII", "IV", "bVII"], ["tonic", "color", "predominant", "color"], [2, 2, 2, 2], 10, MAJOR, ["C"], "adventurous", ["bridge"]),
  ...ENDINGS,
];

const BALLAD = [
  p("country-ballad-major", ["I", "vi", "IV", "V"], ["tonic", "tonic", "predominant", "dominant"], [4, 4, 4, 4], 27, MAJOR, ["A", "B"], "strict", ["hook"]),
  p("country-ballad-minor", ["i", "bVI", "bIII", "V"], ["tonic", "predominant", "tonic", "dominant"], [4, 4, 4, 4], 25, MINOR, ["A", "B"], "strict", ["hook"]),
  p("country-ballad-lift", ["IV", "I", "ii", "V"], ["predominant", "tonic", "predominant", "dominant"], [2, 2, 2, 2], 19, MAJOR, ["B", "C"], "strict", ["bridge"]),
  p("country-ballad-minor-lift", ["bIII", "bVII", "iv", "V"], ["tonic", "color", "predominant", "dominant"], [2, 2, 2, 2], 19, MINOR, ["B", "C"], "strict", ["bridge"]),
  ...ENDINGS,
];

const WALTZ = [
  p("country-waltz-major", ["I", "IV", "I", "V"], ["tonic", "predominant", "tonic", "dominant"], [2, 2, 2, 2], 28, MAJOR, ["A", "B"], "strict", ["hook"], ["3/4"]),
  p("country-waltz-minor", ["i", "iv", "V", "i"], ["tonic", "predominant", "dominant", "tonic"], [2, 2, 2, 2], 26, MINOR, ["A", "B"], "strict", ["hook"], ["3/4"]),
  p("country-waltz-bridge", ["IV", "I", "II", "V"], ["predominant", "tonic", "dominant", "dominant"], [2, 2, 2, 2], 18, MAJOR, ["C"], "colorful", ["bridge"], ["3/4"]),
  ...ENDINGS.map((entry) => ({ ...entry, allowedMeters: ["3/4"] as Meter[] })),
];

export const COUNTRY_ARCHETYPES: GrooveArchetype[] = [
  { id: "honky-tonk", weight: 20, bpmRange: { min: 92, max: 164 }, bpmRanges: [{ value: { min: 108, max: 148 }, weight: 82 }, { value: { min: 92, max: 107 }, weight: 9 }, { value: { min: 149, max: 164 }, weight: 9 }], patterns: HONKY_TONK },
  { id: "bakersfield", weight: 15, bpmRange: { min: 104, max: 176 }, bpmRanges: [{ value: { min: 118, max: 158 }, weight: 82 }, { value: { min: 104, max: 117 }, weight: 9 }, { value: { min: 159, max: 176 }, weight: 9 }], patterns: BAKERSFIELD },
  { id: "outlaw-country", weight: 17, bpmRange: { min: 76, max: 138 }, bpmRanges: [{ value: { min: 88, max: 122 }, weight: 82 }, { value: { min: 76, max: 87 }, weight: 9 }, { value: { min: 123, max: 138 }, weight: 9 }], patterns: OUTLAW },
  { id: "americana-folk", weight: 18, bpmRange: { min: 72, max: 136 }, bpmRanges: [{ value: { min: 84, max: 118 }, weight: 82 }, { value: { min: 72, max: 83 }, weight: 9 }, { value: { min: 119, max: 136 }, weight: 9 }], patterns: AMERICANA },
  { id: "southern-country-rock", weight: 13, bpmRange: { min: 88, max: 154 }, bpmRanges: [{ value: { min: 102, max: 138 }, weight: 82 }, { value: { min: 88, max: 101 }, weight: 9 }, { value: { min: 139, max: 154 }, weight: 9 }], patterns: SOUTHERN },
  { id: "country-ballad", weight: 12, bpmRange: { min: 54, max: 92 }, bpmRanges: [{ value: { min: 62, max: 82 }, weight: 84 }, { value: { min: 54, max: 61 }, weight: 8 }, { value: { min: 83, max: 92 }, weight: 8 }], patterns: BALLAD },
  { id: "country-waltz", weight: 5, bpmRange: { min: 72, max: 132 }, bpmRanges: [{ value: { min: 84, max: 116 }, weight: 84 }, { value: { min: 72, max: 83 }, weight: 8 }, { value: { min: 117, max: 132 }, weight: 8 }], patterns: WALTZ },
];

export const COUNTRY_PALETTE: GrooveColorPalette = {
  medium: {
    "tonic-major": [{ value: "", weight: 50 }, { value: "6", weight: 22 }, { value: "add9", weight: 18 }, { value: "sus2", weight: 10 }],
    "tonic-minor": [{ value: "", weight: 58 }, { value: "7", weight: 24 }, { value: "add9", weight: 12 }, { value: "sus2", weight: 6 }],
    dominant: [{ value: "7", weight: 58 }, { value: "", weight: 24 }, { value: "sus4", weight: 12 }, { value: "9", weight: 6 }],
    major: [{ value: "", weight: 56 }, { value: "6", weight: 18 }, { value: "add9", weight: 16 }, { value: "sus2", weight: 10 }],
    minor: [{ value: "", weight: 60 }, { value: "7", weight: 24 }, { value: "add9", weight: 10 }, { value: "sus2", weight: 6 }],
    suspended: [{ value: "sus4", weight: 62 }, { value: "sus2", weight: 28 }, { value: "", weight: 10 }],
  },
  advanced: {
    "tonic-major": [{ value: "6", weight: 28 }, { value: "add9", weight: 25 }, { value: "6/9", weight: 12 }, { value: "maj7", weight: 8 }, { value: "", weight: 27 }],
    "tonic-minor": [{ value: "7", weight: 28 }, { value: "9", weight: 14 }, { value: "add9", weight: 18 }, { value: "", weight: 40 }],
    dominant: [{ value: "7", weight: 48 }, { value: "9", weight: 16 }, { value: "13", weight: 6 }, { value: "sus4", weight: 14 }, { value: "", weight: 16 }],
    major: [{ value: "6", weight: 24 }, { value: "add9", weight: 24 }, { value: "6/9", weight: 10 }, { value: "maj7", weight: 7 }, { value: "", weight: 35 }],
    minor: [{ value: "7", weight: 28 }, { value: "9", weight: 12 }, { value: "add9", weight: 18 }, { value: "", weight: 42 }],
    suspended: [{ value: "sus4", weight: 44 }, { value: "sus2", weight: 30 }, { value: "7sus4", weight: 16 }, { value: "", weight: 10 }],
  },
};

const ROOTS: GrooveRootDefinition[] = [
  { root: "I", harmonicFunction: "tonic", modes: MAJOR, pool: "core" }, { root: "i", harmonicFunction: "tonic", modes: MINOR, pool: "core" },
  { root: "ii", harmonicFunction: "predominant", modes: MAJOR, pool: "core" }, { root: "iii", harmonicFunction: "tonic", modes: MAJOR, pool: "core" },
  { root: "IV", harmonicFunction: "predominant", modes: MAJOR, pool: "core" }, { root: "iv", harmonicFunction: "predominant", modes: MINOR, pool: "core" },
  { root: "V", harmonicFunction: "dominant", modes: BOTH, pool: "core" }, { root: "vi", harmonicFunction: "tonic", modes: MAJOR, pool: "core" },
  { root: "bIII", harmonicFunction: "tonic", modes: MINOR, pool: "core" }, { root: "bVI", harmonicFunction: "predominant", modes: MINOR, pool: "core" },
  { root: "bVII", harmonicFunction: "color", modes: MINOR, pool: "core" }, { root: "bVII", harmonicFunction: "color", modes: MAJOR, pool: "nearby" },
  { root: "II", harmonicFunction: "dominant", modes: BOTH, pool: "nearby" }, { root: "VI", harmonicFunction: "dominant", modes: BOTH, pool: "nearby" },
  { root: "bIII", harmonicFunction: "color", modes: MAJOR, pool: "chromatic-near" },
];

export function countryArchetype(id: string) { return COUNTRY_ARCHETYPES.find((item) => item.id === id) ?? COUNTRY_ARCHETYPES[0]; }
export const countryGrooveConfig: GrooveStyleConfig = { styleId: "country", defaultArchetypeId: "honky-tonk", archetype: countryArchetype, palette: COUNTRY_PALETTE };
export function resolveCountryStyleProfile(seed: string, requestedArchetypeId?: string) {
  const requested = requestedArchetypeId && countryArchetype(requestedArchetypeId).id === requestedArchetypeId ? requestedArchetypeId : undefined;
  const profile = resolveGrooveStyleProfile({ styleId: "country", name: "Country / Americana", generatorKind: "country", seed, requestedArchetypeId: requested, archetypes: COUNTRY_ARCHETYPES, palette: COUNTRY_PALETTE, roots: ROOTS, allowedModes: [{ value: "major", weight: 76 }, { value: "minor", weight: 24 }], allowedMeters: [{ value: "4/4", weight: 88 }, { value: "3/4", weight: 12 }] });
  if (profile.archetypeId === "country-waltz") profile.allowedMeters = [{ value: "3/4", weight: 90 }, { value: "4/4", weight: 10 }];
  return profile;
}
export const countryStyleDescriptor = { id: "country", name: "Country / Americana", bpmRange: { min: 54, max: 176 } } as const;
