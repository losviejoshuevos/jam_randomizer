import { describe, expect, it } from "vitest";
import { STYLE_OPTIONS } from "@/data/styles";
import {
  generateWheelSession,
  WHEEL_DIFFICULTIES,
} from "@/lib/music/wheel/generate-wheel-session";
import { nextWheelStyle } from "@/lib/music/wheel/style-cycle";

describe("Jam wheel", () => {
  it("offers the six agreed difficulty levels", () => {
    expect(WHEEL_DIFFICULTIES.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("generates a Stage-compatible session for every public style", () => {
    for (const { id } of STYLE_OPTIONS) {
      const result = generateWheelSession({
        styleId: id,
        difficulty: 4,
        seed: `wheel-test-${id}`,
      });

      expect(result.session.styleId).toBe(id);
      expect(result.session.timeline.length).toBeGreaterThanOrEqual(3);
      expect(result.session.timeline.every(({ durationSeconds }) => durationSeconds > 0)).toBe(true);
      expect(result.session.sections.every(({ chords }) => chords.length > 0)).toBe(true);
      expect(result.settings.bpm).toBe(result.session.bpm);
    }
  });

  it("does not repeat a style before the current cycle is exhausted", () => {
    const styles = ["funk", "rock", "blues"];
    const first = nextWheelStyle(styles, [], 0);
    const second = nextWheelStyle(styles, first.remaining, 0);
    const third = nextWheelStyle(styles, second.remaining, 0);

    expect(new Set([first.selected, second.selected, third.selected]).size).toBe(3);
    expect(third.remaining).toEqual([]);
    expect(nextWheelStyle(styles, third.remaining, 0).selected).toBe("funk");
  });
});
