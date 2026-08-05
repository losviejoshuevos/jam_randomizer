import type { JamChord } from "../domain/types";

export interface ChordDisplayGroup {
  id: string;
  startIndex: number;
  durationBars: number;
  chords: JamChord[];
}

export function groupChordsForDisplay(
  chords: readonly JamChord[],
): ChordDisplayGroup[] {
  const groups: ChordDisplayGroup[] = [];

  for (let index = 0; index < chords.length; index += 1) {
    const chord = chords[index];
    const nextChord = chords[index + 1];

    if (!chord) continue;

    if (chord.durationBars === 0.5 && nextChord?.durationBars === 0.5) {
      groups.push({
        id: `half-bar-${chord.id}-${nextChord.id}`,
        startIndex: index,
        durationBars: 1,
        chords: [chord, nextChord],
      });
      index += 1;
      continue;
    }

    groups.push({
      id: chord.id,
      startIndex: index,
      durationBars: chord.durationBars,
      chords: [chord],
    });
  }

  return groups;
}
