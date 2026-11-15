import { describe, expect, it } from "vitest";
import {
  BLOCK_PROFILE, FACE_FRONT, NECK_PROFILE, PANEL_D, PANEL_H, PLATE_TOP, plateThickness, type ProfileStep,
} from "./exteriorProfile";

const faceBack = FACE_FRONT - PANEL_D;
const points = (steps: ProfileStep[]) => steps.map((s) => s.to);
const depths = (steps: ProfileStep[]) => points(steps).map(([d]) => d);
const heights = (steps: ProfileStep[]) => points(steps).map(([, y]) => y);

describe("exterior side profile (from the side photo)", () => {
  it("both mounting posts run from inside the base into the face body", () => {
    for (const post of [NECK_PROFILE, BLOCK_PROFILE]) {
      const minY = Math.min(...heights(post));
      expect(Math.min(...depths(post))).toBeLessThan(plateThickness(minY));
      expect(Math.max(...depths(post))).toBeGreaterThan(faceBack);
    }
  });

  it("post edges are straight lines, as in the photo, not curves", () => {
    for (const post of [NECK_PROFILE, BLOCK_PROFILE]) {
      expect(post.every((step) => step.via === undefined)).toBe(true);
    }
  });

  it("post undersides and the lower post's top slope straight down from the base to the face", () => {
    const slope = (steps: ProfileStep[], i: number) => {
      const [d0, y0] = steps[i - 1]!.to;
      const [d1, y1] = steps[i]!.to;
      return (Math.atan2(y0 - y1, d1 - d0) * 180) / Math.PI;
    };
    expect(slope(NECK_PROFILE, 1)).toBeCloseTo(40, -1); // upper post underside
    expect(slope(BLOCK_PROFILE, 1)).toBeCloseTo(26, -1); // lower post top
    const [d0, y0] = BLOCK_PROFILE[5]!.to; // lower post underside, base end
    const [d1, y1] = BLOCK_PROFILE[4]!.to; // face end
    expect(d1).toBeGreaterThan(d0);
    expect(y1).toBeLessThan(y0);
  });

  it("leaves an open finger gap of about 1.4 between the posts at the base", () => {
    // Where each straight edge leaves the base surface.
    const exitHeight = (steps: ProfileStep[], i: number) => {
      const [d0, y0] = steps[i - 1]!.to;
      const [d1, y1] = steps[i]!.to;
      for (let t = 0; t <= 1; t += 0.001) {
        const y = y0 + (y1 - y0) * t;
        if (d0 + (d1 - d0) * t >= plateThickness(y)) return y;
      }
      return NaN;
    };
    const neckBottom = exitHeight(NECK_PROFILE, 1);
    const blockTop = exitHeight(BLOCK_PROFILE, 1);
    expect(neckBottom - blockTop).toBeCloseTo(1.4, 1);
  });

  it("post outlines have no corner sharper than 90°, so the rounded edges leave no slivers", () => {
    for (const post of [NECK_PROFILE, BLOCK_PROFILE]) {
      const pts = points(post);
      pts.forEach((p, i) => {
        const prev = pts[(i - 1 + pts.length) % pts.length]!;
        const next = pts[(i + 1) % pts.length]!;
        const a = [prev[0] - p[0], prev[1] - p[1]];
        const b = [next[0] - p[0], next[1] - p[1]];
        expect(a[0]! * b[0]! + a[1]! * b[1]!).toBeLessThanOrEqual(1e-9);
      });
    }
  });

  it("base rises above the face and tapers to a thin top edge", () => {
    expect(PLATE_TOP).toBeGreaterThan(PANEL_H / 2);
    expect(plateThickness(PLATE_TOP)).toBeLessThan(0.05);
    expect(plateThickness(0)).toBeGreaterThan(0.13);
  });

  it("nothing hangs below the lower post: the bottom is just the panel's own end", () => {
    const bottomBend = PANEL_H / 2 - 0.9 * PANEL_H;
    expect(Math.min(...heights(BLOCK_PROFILE))).toBeGreaterThan(bottomBend);
  });
});
