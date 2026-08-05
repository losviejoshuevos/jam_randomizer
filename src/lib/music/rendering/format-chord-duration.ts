function barsNoun(value: number): string {
  if (!Number.isInteger(value)) return "такта";
  const absolute = Math.abs(value);
  const lastTwoDigits = absolute % 100;
  const lastDigit = absolute % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return "тактов";
  if (lastDigit === 1) return "такт";
  if (lastDigit >= 2 && lastDigit <= 4) return "такта";
  return "тактов";
}

export function formatChordDuration(durationBars: number): string {
  const wholeBars = Math.floor(durationBars);
  const hasHalfBar = durationBars - wholeBars === 0.5;
  const value = hasHalfBar
    ? wholeBars === 0
      ? "½"
      : `${wholeBars}½`
    : String(durationBars);

  return `${value} ${barsNoun(durationBars)}`;
}
