import { describe, expect, it } from "vitest";
import {
  createSeededRandom,
  deriveSeed,
  RandomError,
} from "@/lib/music/random";

function take(seed: string, count: number): number[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () => random.next());
}

describe("seeded random", () => {
  it("replays the same sequence for the same seed", () => {
    expect(take("friday-funk", 20)).toEqual(take("friday-funk", 20));
  });

  it("produces a stable golden sequence", () => {
    expect(take("jam-randomizer", 5)).toEqual([
      0.8807935705408454,
      0.6573956608772278,
      0.5384803423658013,
      0.5775658811908215,
      0.9280136399902403,
    ]);
  });

  it("produces different sequences for different seeds", () => {
    expect(take("section-a", 10)).not.toEqual(take("section-b", 10));
  });

  it("derives stable independent seeds for named streams", () => {
    const structureSeed = deriveSeed("session-42", "structure");
    const sectionASeed = deriveSeed("session-42", "section:A");
    const sectionBSeed = deriveSeed("session-42", "section:B");

    expect(deriveSeed("session-42", "section:A")).toBe(sectionASeed);
    expect(new Set([structureSeed, sectionASeed, sectionBSeed]).size).toBe(3);
    expect(sectionASeed).toMatch(/^[a-f0-9]{16}$/);
  });

  it("rejects empty seeds and namespaces", () => {
    expect(() => createSeededRandom(" ")).toThrowError(
      expect.objectContaining<Partial<RandomError>>({ code: "EMPTY_SEED" }),
    );
    expect(() => deriveSeed("session", " ")).toThrowError(
      expect.objectContaining<Partial<RandomError>>({ code: "EMPTY_NAMESPACE" }),
    );
  });
});
