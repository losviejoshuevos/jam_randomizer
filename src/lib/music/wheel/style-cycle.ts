export const WHEEL_STYLE_CYCLE_KEY = "jam-randomizer:wheel-style-cycle";

export function nextWheelStyle(
  styleIds: readonly string[],
  storedRemaining: readonly string[],
  randomValue: number,
): { selected: string; remaining: string[] } {
  if (styleIds.length === 0) throw new Error("Колесо должно содержать хотя бы один стиль.");

  const allowed = new Set(styleIds);
  const validStored = storedRemaining.filter(
    (id, index) => allowed.has(id) && storedRemaining.indexOf(id) === index,
  );
  const pool = validStored.length ? validStored : [...styleIds];
  const boundedRandom = Number.isFinite(randomValue)
    ? Math.min(0.999999999, Math.max(0, randomValue))
    : 0;
  const index = Math.floor(boundedRandom * pool.length);
  const selected = pool[index] ?? pool[0];

  return {
    selected,
    remaining: pool.filter((id) => id !== selected),
  };
}
