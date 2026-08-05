import { describe, expect, it } from "vitest";
import {
  createSeededRandom,
  RandomError,
  weightedChoice,
} from "@/lib/music/random";

describe("weightedChoice", () => {
  it("is reproducible with a seeded random source", () => {
    const values = [
      { value: "tonic", weight: 5 },
      { value: "color", weight: 3 },
      { value: "dominant", weight: 2 },
    ] as const;

    const draw = () => {
      const random = createSeededRandom("weighted-functions");
      return Array.from({ length: 30 }, () => weightedChoice(values, random));
    };

    expect(draw()).toEqual(draw());
  });

  it("never selects zero-weight values", () => {
    const random = createSeededRandom("zero-weight");
    const values = [
      { value: "never", weight: 0 },
      { value: "always", weight: 1 },
    ];

    const result = Array.from({ length: 1_000 }, () =>
      weightedChoice(values, random),
    );

    expect(new Set(result)).toEqual(new Set(["always"]));
  });

  it("roughly follows configured weights over many deterministic draws", () => {
    const random = createSeededRandom("distribution-check");
    const values = [
      { value: "low", weight: 1 },
      { value: "high", weight: 3 },
    ];
    const draws = 10_000;
    let lowCount = 0;

    for (let draw = 0; draw < draws; draw += 1) {
      if (weightedChoice(values, random) === "low") {
        lowCount += 1;
      }
    }

    expect(lowCount / draws).toBeGreaterThan(0.23);
    expect(lowCount / draws).toBeLessThan(0.27);
  });

  it.each([
    { values: [], code: "EMPTY_WEIGHTED_VALUES" },
    { values: [{ value: "x", weight: -1 }], code: "INVALID_WEIGHT" },
    { values: [{ value: "x", weight: Number.NaN }], code: "INVALID_WEIGHT" },
    { values: [{ value: "x", weight: 0 }], code: "ZERO_TOTAL_WEIGHT" },
  ] as const)("rejects invalid input with $code", ({ values, code }) => {
    expect(() =>
      weightedChoice(values, createSeededRandom("invalid-input")),
    ).toThrowError(expect.objectContaining<Partial<RandomError>>({ code }));
  });

  it("rejects invalid random source output", () => {
    expect(() =>
      weightedChoice([{ value: "x", weight: 1 }], { next: () => 1 }),
    ).toThrowError(
      expect.objectContaining<Partial<RandomError>>({
        code: "INVALID_RANDOM_VALUE",
      }),
    );
  });
});
