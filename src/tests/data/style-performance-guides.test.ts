import { describe, expect, it } from "vitest";
import { STYLE_OPTIONS } from "@/data/styles";
import {
  PERFORMANCE_GUIDE_ROLES,
  STYLE_PERFORMANCE_GUIDES,
  stylePerformanceGuide,
} from "@/data/style-performance-guides";

describe("Style performance guides", () => {
  it("covers every available style with complete role tips", () => {
    expect(Object.keys(STYLE_PERFORMANCE_GUIDES).sort()).toEqual(
      STYLE_OPTIONS.map(({ id }) => id).sort(),
    );

    for (const { id } of STYLE_OPTIONS) {
      const guide = stylePerformanceGuide(id);
      expect(guide.styleId).toBe(id);
      expect(guide.groove.length).toBeGreaterThan(40);
      for (const role of PERFORMANCE_GUIDE_ROLES) {
        expect(guide.roles[role].length).toBeGreaterThanOrEqual(2);
        expect(guide.roles[role].every((tip) => tip.length > 20)).toBe(true);
      }
    }
  });

  it("falls back to the Funk guide for an unknown style", () => {
    expect(stylePerformanceGuide("unknown").styleId).toBe("funk");
  });
});
