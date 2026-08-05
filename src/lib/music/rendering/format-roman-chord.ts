import type { RomanChord } from "../domain/types";

export function formatRomanChord(roman: RomanChord): string {
  return roman.replace(/^b/, "♭").replace(/^#/, "♯");
}
