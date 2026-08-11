import type {
  HarmonicFunction,
  Mode,
  PitchClass,
  RomanChord,
} from "../domain/types";
import { renderRomanChord } from "./render-roman-chord";

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

const PITCH_CLASS_TO_SEMITONE: Record<PitchClass, number> = {
  C: 0,
  "C#": 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11,
};

const SEMITONE_TO_ROMAN = [
  "I",
  "bII",
  "II",
  "bIII",
  "III",
  "IV",
  "#IV",
  "V",
  "bVI",
  "VI",
  "bVII",
  "VII",
] as const;

const SHARP_SEMITONE_TO_ROMAN: Partial<Record<number, string>> = {
  1: "#I",
  3: "#II",
  6: "#IV",
  8: "#V",
  10: "#VI",
};

type ParsedQuality = "major" | "minor" | "diminished" | "augmented" | "suspended";

interface ParsedSuffix {
  quality: ParsedQuality;
  suffix: string;
}

export interface ParsedChordSymbol {
  roman: RomanChord;
  renderedSymbol: string;
  harmonicFunction: HarmonicFunction;
}

function parseSuffix(rawSuffix: string): ParsedSuffix | null {
  const suffix = rawSuffix
    .replace(/[()\s]/g, "")
    .replaceAll("♭", "b")
    .replaceAll("♯", "#");

  if (suffix === "") return { quality: "major", suffix: "" };
  if (suffix === "m" || suffix === "min" || suffix === "-") {
    return { quality: "minor", suffix: "" };
  }
  if (suffix === "maj" || suffix === "M" || suffix === "Δ") {
    return { quality: "major", suffix: "" };
  }

  const minor = /^(?:m|min|-)(maj7|maj9|6\/9|6|7b5|7|9|11|13|add2|add4|add9)$/.exec(
    suffix,
  );
  if (minor) return { quality: "minor", suffix: minor[1] };

  const major = /^(?:maj|M|Δ)(7|9)$/.exec(suffix);
  if (major) return { quality: "major", suffix: `maj${major[1]}` };

  if (suffix === "ø" || suffix === "ø7") {
    return { quality: "minor", suffix: "7b5" };
  }
  if (suffix === "dim" || suffix === "°") {
    return { quality: "diminished", suffix: "dim" };
  }
  if (suffix === "dim7" || suffix === "°7") {
    return { quality: "diminished", suffix: "dim7" };
  }
  if (suffix === "aug" || suffix === "+") {
    return { quality: "augmented", suffix: "aug" };
  }

  if (/^(?:sus|sus4)$/.test(suffix)) {
    return { quality: "suspended", suffix: "sus4" };
  }
  if (suffix === "sus2") {
    return { quality: "suspended", suffix: "sus2" };
  }
  if (
    /^(?:maj7|maj9|6\/9|6|7sus4|9sus4|13sus4|7#9|7b9|7|9|11|13|add2|add4|add9)$/.test(
      suffix,
    )
  ) {
    return { quality: "major", suffix };
  }

  return null;
}

function romanRoot(
  note: string,
  key: PitchClass,
  lowercase: boolean,
): { roman: string; semitoneOffset: number } | null {
  const noteSemitone = NOTE_TO_SEMITONE[note];
  if (noteSemitone === undefined) return null;
  const semitoneOffset =
    (noteSemitone - PITCH_CLASS_TO_SEMITONE[key] + 12) % 12;
  const upperRoman = note.includes("#")
    ? SHARP_SEMITONE_TO_ROMAN[semitoneOffset] ?? SEMITONE_TO_ROMAN[semitoneOffset]
    : SEMITONE_TO_ROMAN[semitoneOffset];
  const roman = lowercase ? upperRoman.toLowerCase() : upperRoman;
  return { roman, semitoneOffset };
}

function inferFunction(
  semitoneOffset: number,
  suffix: string,
  mode: Mode,
  quality: ParsedQuality,
): HarmonicFunction {
  if (
    semitoneOffset === 0 ||
    (mode === "major" && (semitoneOffset === 4 || semitoneOffset === 9)) ||
    (mode === "minor" && semitoneOffset === 3)
  ) {
    return "tonic";
  }
  if (semitoneOffset === 7 || semitoneOffset === 11) return "dominant";
  if (
    semitoneOffset === 2 &&
    (quality === "major" || quality === "augmented") &&
    /^(?:7|9|11|13|7b9|7#9)/.test(suffix)
  ) {
    return "dominant";
  }
  if (
    semitoneOffset === 2 ||
    semitoneOffset === 5 ||
    (mode === "minor" && semitoneOffset === 8)
  ) {
    return "predominant";
  }
  return "color";
}

export function parseChordSymbol(
  input: string,
  key: PitchClass,
  mode: Mode,
): ParsedChordSymbol | null {
  const normalized = input
    .trim()
    .replaceAll("♭", "b")
    .replaceAll("♯", "#");
  const match = /^([A-Ga-g])([#b]?)(.*?)(?:\/([A-Ga-g])([#b]?))?$/.exec(
    normalized,
  );
  if (!match) return null;

  const [, letter, accidental, rawSuffix, bassLetter, bassAccidental] = match;
  const suffix = parseSuffix(rawSuffix);
  if (!suffix) return null;

  const root = romanRoot(
    `${letter.toUpperCase()}${accidental}`,
    key,
    suffix.quality === "minor" || suffix.quality === "diminished",
  );
  if (!root) return null;

  const bass = bassLetter
    ? romanRoot(`${bassLetter.toUpperCase()}${bassAccidental}`, key, false)
    : null;
  if (bassLetter && !bass) return null;

  const roman = `${root.roman}${suffix.suffix}${bass ? `/@${bass.roman}` : ""}`;

  try {
    return {
      roman,
      renderedSymbol: renderRomanChord(roman, key, mode),
      harmonicFunction: inferFunction(
        root.semitoneOffset,
        suffix.suffix,
        mode,
        suffix.quality,
      ),
    };
  } catch {
    return null;
  }
}
