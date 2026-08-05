import { describe, expect, it } from "vitest";
import { calculateTransitionWarningSeconds } from "@/lib/music/tempo/transition-timing";

describe("calculateTransitionWarningSeconds", () => {
  it("covers one complete square plus one safety bar in 4/4", () => {
    expect(calculateTransitionWarningSeconds(8, 120, "4/4")).toBe(18);
  });

  it("uses three beats per bar in 3/4 and rounds up for safety", () => {
    expect(calculateTransitionWarningSeconds(4, 100, "3/4")).toBe(9);
  });
});
