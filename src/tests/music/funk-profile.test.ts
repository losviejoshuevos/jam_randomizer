import { describe, expect, it } from "vitest";
import { funkStyleProfile } from "@/data/styles";

describe("Funk style profile", () => {
  it("is JSON serializable and supports the MVP meters", () => {
    const serialized = JSON.stringify(funkStyleProfile);
    const parsed = JSON.parse(serialized) as typeof funkStyleProfile;

    expect(parsed.id).toBe("funk");
    expect(parsed.allowedMeters.map(({ value }) => value)).toEqual(["4/4", "3/4"]);
    expect(serialized).not.toContain("undefined");
  });

  it("keeps tonal freedom levels progressively broader", () => {
    expect(funkStyleProfile.tonalSourceWeights.strict.neighboringKey).toBe(0);
    expect(funkStyleProfile.tonalSourceWeights.colorful.parallelMode).toBeGreaterThan(0);
    expect(funkStyleProfile.tonalSourceWeights.adventurous.neighboringKey).toBeGreaterThan(0);
  });
});
