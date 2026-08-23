function archetypeMarker(archetypeId: string): string {
  return archetypeId
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function addArchetypeToSessionCode(
  code: string,
  archetypeId?: string,
): string {
  if (!archetypeId) return code;

  const marker = archetypeMarker(archetypeId);
  const prefixEnd = code.indexOf("-");
  if (!marker || prefixEnd < 0) return code;

  const prefix = code.slice(0, prefixEnd);
  const suffix = code.slice(prefixEnd + 1);
  if (suffix.startsWith(`${marker}-`)) return code;

  return `${prefix}-${marker}-${suffix}`;
}
