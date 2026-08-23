import type { Mode, RomanChord } from "../domain/types";

function formatMinorScaleDegrees(roman: RomanChord): string {
  return roman.replace(
    /(^|\/@)(b?)(VII|III|VI|vii|iii|vi)(?=$|[^IViv])/g,
    (_match, prefix: string, accidental: string, degree: string) =>
      `${prefix}${accidental === "b" ? "" : "#"}${degree}`,
  );
}

export function formatRomanChord(
  roman: RomanChord,
  mode: Mode = "major",
): string {
  const scaleRelativeRoman =
    mode === "minor" ? formatMinorScaleDegrees(roman) : roman;

  return scaleRelativeRoman
    .replace("/@", "/")
    .replace(/(^|\/)b/g, "$1♭")
    .replace(/(^|\/)#/g, "$1♯");
}
