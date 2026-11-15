import { describe, expect, it } from "vitest";
import {
  DOOR_D, DOOR_W, LATCH_FROM, LATCH_TO, LATCH_Y, PLATE_L, PLATE_W, ROUND_HOLES, SCREWS, SQUARES, SQUARE_H,
  STAND_R, plateY,
} from "./doorProfile";
import { NECK_BOTTOM, NECK_TOP, TURN_Y } from "./interiorProfile";

describe("door edge faceplate (from the edge photo)", () => {
  it("fits on the door edge with a margin on both sides", () => {
    expect(PLATE_W).toBeLessThan(DOOR_D - 0.1);
  });

  it("is about 7.4 times as long as it is wide, as photographed", () => {
    expect(PLATE_L / PLATE_W).toBeCloseTo(7.4, 0);
  });

  it("puts the latch at the handle's height, with the three square openings below it", () => {
    const latchMid = plateY((LATCH_FROM + LATCH_TO) / 2);
    expect(latchMid).toBeCloseTo(LATCH_Y);
    expect(latchMid).toBeLessThan(NECK_TOP);
    expect(latchMid).toBeGreaterThan(NECK_BOTTOM);
    expect(SQUARES).toHaveLength(3);
    for (const t of SQUARES) expect(plateY(t)).toBeLessThan(plateY(LATCH_TO));
    expect(plateY(SQUARES[1]!)).toBeGreaterThan(TURN_Y - 0.4);
  });

  it("has six screws and two round holes, none overlapping the openings", () => {
    expect(SCREWS).toHaveLength(6);
    expect(ROUND_HOLES).toHaveLength(2);
    for (const { t, d } of [...SCREWS, ...ROUND_HOLES]) {
      const r = d / 2 / PLATE_L;
      expect(t + r < LATCH_FROM || t - r > LATCH_TO).toBe(true);
      for (const s of SQUARES) expect(Math.abs(t - s)).toBeGreaterThan(r + SQUARE_H / 2 / PLATE_L);
    }
  });
});

describe("round stand", () => {
  it("is wide enough for the door and both lock units to stand on", () => {
    expect(STAND_R).toBeGreaterThan(Math.hypot(DOOR_W / 2, DOOR_D / 2 + 0.75));
  });
});
