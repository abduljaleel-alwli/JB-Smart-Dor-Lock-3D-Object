import { describe, expect, it } from "vitest";
import {
  BASE_D, COVE_END, COVE_START, COVER_FRONT, LEVER_D, MODULE_FRONT, NECK_BOTTOM, NECK_TOP, PADDLE_BOTTOM,
  PADDLE_FRONT, PADDLE_TOP, PADDLE_TOP_LEAN, ROSE_D, TURN_Y, coveDepthAt, covePoint, paddleLean,
} from "./interiorProfile";

describe("interior side profile (from the side photo)", () => {
  it("the back body is about 60% as deep as the screen unit", () => {
    expect(BASE_D / MODULE_FRONT).toBeCloseTo(0.6, 1);
  });

  it("the cove runs from the screen unit's front down onto the back body", () => {
    const [d0, y0] = covePoint(0);
    expect(d0).toBeCloseTo(MODULE_FRONT, 6);
    expect(y0).toBeCloseTo(COVE_START, 6);
    const [depth, y] = covePoint(Math.PI / 2);
    expect(depth).toBeCloseTo(COVER_FRONT, 6);
    expect(y).toBeCloseTo(COVE_END, 6);
    // Concave: halfway down it has already cut most of the way back.
    expect(coveDepthAt((COVE_START + COVE_END) / 2).depth).toBeLessThan((MODULE_FRONT + COVER_FRONT) / 2);
  });

  it("the paddle stands out about 1.7 times the screen unit's depth", () => {
    expect(PADDLE_FRONT / MODULE_FRONT).toBeCloseTo(1.7, 1);
  });

  it("the paddle's top is beside the cove and the neck starts just below it", () => {
    expect(PADDLE_TOP).toBeGreaterThan(COVE_START);
    expect(NECK_TOP).toBeLessThan(COVE_END);
    expect(NECK_BOTTOM).toBeGreaterThan(PADDLE_BOTTOM);
  });

  it("the paddle's upper part leans back toward the door while its middle is upright", () => {
    expect(paddleLean(PADDLE_TOP)).toBeCloseTo(-PADDLE_TOP_LEAN, 6);
    expect(paddleLean((NECK_TOP + NECK_BOTTOM) / 2)).toBe(0);
  });

  it("the thumbturn lever stands out almost as far as the screen unit's front, under the paddle", () => {
    expect((BASE_D + ROSE_D + LEVER_D) / MODULE_FRONT).toBeCloseTo(0.9, 1);
    expect(TURN_Y).toBeLessThan(PADDLE_BOTTOM);
  });
});
