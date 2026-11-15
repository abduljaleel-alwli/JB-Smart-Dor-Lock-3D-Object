// Door section, the latch faceplate on its edge and the round stand it rests on.
// The faceplate layout is traced from the user's photo of the door edge; positions are
// fractions of the plate's length measured from its top end. Units ≈ decimetres.
// Kept React/three-free so doorProfile.test.ts can check it.

import { NECK_BOTTOM, NECK_TOP } from "./interiorProfile";

export const DOOR_W = 1.62;
export const DOOR_H = 5.25;
export const DOOR_D = 0.46;
export const DOOR_BOTTOM = -DOOR_H / 2;

/** Stainless faceplate on the door edge (the +x side, facing the "side" view). */
export const PLATE_W = 0.24;
export const PLATE_L = 1.78;
/** Plate thickness including its edge bevel. */
export const PLATE_T = 0.014;
export const PLATE_END_R = 0.1;

/** Latch opening, as fractions of the plate length from the top. */
export const LATCH_FROM = 0.284;
export const LATCH_TO = 0.403;
export const LATCH_OPEN_W = 0.195;
/** The latch tongue stands out of the plate, with its bevel across the door thickness. */
export const LATCH_OUT = 0.1;
export const LATCH_BEVEL_OUT = 0.035;

/** The latch lines up with the handle's spindle (the middle of the interior handle neck). */
export const LATCH_Y = (NECK_TOP + NECK_BOTTOM) / 2;
export const PLATE_TOP_Y = LATCH_Y + ((LATCH_FROM + LATCH_TO) / 2) * PLATE_L;
export const PLATE_CENTER_Y = PLATE_TOP_Y - PLATE_L / 2;

/** Height on the door of a point a fraction `t` down the plate. */
export const plateY = (t: number) => PLATE_TOP_Y - t * PLATE_L;

export const SCREWS: { t: number; d: number }[] = [
  { t: 0.059, d: 0.1 },
  { t: 0.258, d: 0.075 },
  { t: 0.691, d: 0.08 },
  { t: 0.767, d: 0.1 },
  { t: 0.825, d: 0.075 },
  { t: 0.958, d: 0.09 },
];
export const ROUND_HOLES: { t: number; d: number }[] = [
  { t: 0.199, d: 0.05 },
  { t: 0.867, d: 0.045 },
];
/** Three square bolt openings below the latch. */
export const SQUARES = [0.487, 0.559, 0.631];
export const SQUARE_W = 0.11;
export const SQUARE_H = 0.105;
/** Stamped marks: maker's shield and name, the turn arrow, the triangle at the bottom. */
export const MARKS = { shield: 0.119, name: 0.172, arrow: 0.419, triangle: 0.905 };

/** Round stand under the door. */
export const STAND_R = 1.55;
export const STAND_H = 0.13;
export const STAND_CHAMFER = 0.03;
export const STAND_RING_R = 1.4;
export const PLINTH_H = 0.035;
