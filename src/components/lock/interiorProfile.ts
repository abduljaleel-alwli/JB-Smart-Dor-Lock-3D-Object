// Interior unit dimensions, traced from the user's side photo (door-edge view) and checked
// against the front and three-quarter photos. Depths are measured from the door surface
// (+ into the room); heights share the lock's vertical axis (0 = door centre line).
// Kept React/three-free so interiorProfile.test.ts can check it.

export const BASE_W = 0.76;
export const BASE_TOP = 2.3;
export const BASE_BOTTOM = -2.0;
/** Full-height back body. In the side photo it is about 60% as deep as the screen unit. */
export const BASE_D = 0.265;

/** Screen unit stacked on the upper half of the back body. */
export const MODULE_W = 0.7;
export const MODULE_TOP = BASE_TOP - 0.04;
export const MODULE_FRONT = 0.44;
/** The top front edge rolls back gently: shallow in depth, long in height. */
export const MODULE_TOP_ROLL_D = 0.045;
export const MODULE_TOP_ROLL_H = 0.14;
export const GLASS_TOP = MODULE_TOP - MODULE_TOP_ROLL_H - 0.005;
export const GLASS_BOTTOM = 0.42;
export const SCREEN_TOP = 2.08;
export const SCREEN_BOTTOM = 0.6;
export const HOME_Y = 0.52;

/** Concave cove under the screen unit, curving from its front face down onto the back body. */
export const COVE_START = 0.28;
export const COVE_END = -0.04;
/** Small rounding of the convex edge where the cove leaves the screen unit's front. */
export const COVE_LIP = 0.03;

/** The cove ends flush on the back body's front (no separate handle cover, as photographed). */
export const COVER_FRONT = BASE_D;

/** Paddle: a flat slab standing well out from the lock on a long ribbed neck. */
export const PADDLE_TOP = 0.47;
export const PADDLE_BOTTOM = -0.6;
export const PADDLE_T = 0.11;
export const PADDLE_FRONT = 0.74;
export const PADDLE_BACK = PADDLE_FRONT - PADDLE_T;
/** The upper part of the paddle leans back toward the door; the lower part is upright. */
export const PADDLE_TOP_LEAN = 0.06;
export const PADDLE_LEAN_SPAN = 0.5;
/** The bottom tip turns back slightly toward the door. */
export const PADDLE_TIP_CURL = 0.025;
export const PADDLE_CURL_SPAN = 0.16;

/** Ribbed neck (oval section, taller than wide) and the smooth boss behind the paddle. */
export const NECK_TOP = -0.06;
export const NECK_BOTTOM = -0.51;
export const NECK_W = 0.31;
export const NECK_RIBS = 22;
export const NECK_RIB_H = 0.012;
export const BOSS_D = 0.06;
export const BOSS_PAD = 0.025;

/** Thumbturn under the handle: a thin round rose and a tapered lever that stands proud. */
export const TURN_Y = -1.0;
export const ROSE_R = 0.16;
export const ROSE_D = 0.03;
export const LEVER_LEN = 0.4;
export const LEVER_W_TOP = 0.11;
export const LEVER_W_BOTTOM = 0.085;
export const LEVER_D = 0.105;
/** Lever rotation in the front view, top end toward the viewer's left (radians). */
export const LEVER_TILT = 0.45;

export const KEY_Y = -1.79;

const COVE_A = MODULE_FRONT - COVER_FRONT;
const COVE_B = COVE_START - COVE_END;

/** Point on the cove at parameter θ (0 = screen front at COVE_START, π/2 = back body front at COVE_END). */
export function covePoint(theta: number): [depth: number, y: number] {
  return [MODULE_FRONT - COVE_A * Math.sin(theta), COVE_END + COVE_B * Math.cos(theta)];
}

/** Front depth of the lower screen unit at height y within the cove, and its slope dDepth/dy. */
export function coveDepthAt(y: number) {
  const c = Math.min(Math.max((y - COVE_END) / COVE_B, 0), 1);
  const s = Math.sqrt(1 - c * c);
  return { depth: MODULE_FRONT - COVE_A * s, slope: s > 1e-6 ? (COVE_A * c) / (COVE_B * s) : Infinity };
}

/** Share of the lean zone (from its lower end) that eases in before the lean turns straight. */
const LEAN_EASE = 0.35;

/**
 * Depth offset of the paddle at height y (negative = toward the door). The upper part is a
 * straight tilted slab, eased into the upright middle; the bottom tip turns back slightly.
 */
export function paddleLean(y: number) {
  const lean = PADDLE_TOP - PADDLE_LEAN_SPAN;
  const curl = PADDLE_BOTTOM + PADDLE_CURL_SPAN;
  if (y > lean) {
    const t = (y - lean) / PADDLE_LEAN_SPAN;
    const f = t < LEAN_EASE ? (t * t) / (2 * LEAN_EASE) : t - LEAN_EASE / 2;
    return (-PADDLE_TOP_LEAN * f) / (1 - LEAN_EASE / 2);
  }
  if (y < curl) return -PADDLE_TIP_CURL * ((curl - y) / PADDLE_CURL_SPAN) ** 2;
  return 0;
}
