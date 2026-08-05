import type { Mode, PitchClass, RomanChord } from "../domain/types";

const PITCH_TO_SEMITONE: Record<PitchClass, number> = {
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

const SHARP_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const FLAT_NAMES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

const DEGREE_TO_SEMITONES: Record<string, number> = {
  I: 0,
  II: 2,
  III: 4,
  IV: 5,
  V: 7,
  VI: 9,
  VII: 11,
};

function shouldUseFlats(key: PitchClass, mode: Mode): boolean {
  return (
    key.includes("b") ||
    key === "F" ||
    (mode === "minor" && ["C", "D", "F", "G"].includes(key))
  );
}

function renderPitch(
  tonic: PitchClass,
  semitoneOffset: number,
  mode: Mode,
  accidental?: "b" | "#",
): string {
  const semitone = (PITCH_TO_SEMITONE[tonic] + semitoneOffset + 12) % 12;
  const useFlats =
    accidental === "b" ||
    (accidental !== "#" && shouldUseFlats(tonic, mode));

  return (useFlats ? FLAT_NAMES : SHARP_NAMES)[semitone];
}

export function renderRomanChord(
  roman: RomanChord,
  key: PitchClass,
  mode: Mode,
): string {
  if (roman === "V7/V") {
    return `${renderPitch(key, 2, mode)}7`;
  }

  const match = /^(b|#)?(VII|III|VI|IV|II|V|I|vii|iii|vi|iv|ii|v|i)(maj7|7|9)?$/.exec(
    roman,
  );

  if (!match) {
    throw new Error(`Unsupported RomanChord: ${roman}.`);
  }

  const [, accidental, rawDegree, extension = ""] = match;
  const degree = rawDegree.toUpperCase();
  const accidentalOffset = accidental === "b" ? -1 : accidental === "#" ? 1 : 0;
  const root = renderPitch(
    key,
    DEGREE_TO_SEMITONES[degree] + accidentalOffset,
    mode,
    accidental as "b" | "#" | undefined,
  );
  const isMinor = rawDegree === rawDegree.toLowerCase();
  const quality = isMinor ? `m${extension}` : extension;

  return `${root}${quality}`;
}
