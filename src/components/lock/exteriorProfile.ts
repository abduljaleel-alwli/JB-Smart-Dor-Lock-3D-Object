// Side profile of the exterior unit, traced from the user's side photo of the
// installed lock and corrected for the camera's perspective (it sits above the
// lock, so lower parts appear smaller). Units ≈ decimetres.
// `depth` is measured outward from the door surface; `y` is height from the face centre.

/** A side-profile path: straight segments, or smooth curves when `via` (a control point) is given. */
export type ProfileStep = { to: [depth: number, y: number]; via?: [depth: number, y: number] };

export const PANEL_W = 0.72;
export const PANEL_H = 4.2;

/** Front of the face, i.e. how far the whole unit stands off the door. */
export const FACE_FRONT = 0.66;
/** The face is a thick handle body, not a thin plate. */
export const PANEL_D = 0.26;

/** The top section leans back towards the door; the bottom section turns back harder. */
export const TOP_TILT = 0.24;
export const BOTTOM_TILT = 0.56;

/** Mounting base: taller than the face at the top, ending level with the face's bottom. */
export const PLATE_W = 0.96;
export const PLATE_TOP = 2.27;
export const PLATE_BOTTOM = -2.04;
/** Base thickness at each height: tapered top, slightly thinner towards the bottom, tapered bottom. */
export const PLATE_THICKNESS: [y: number, thickness: number][] = [
  [2.27, 0.03],
  [2.2, 0.055],
  [2.12, 0.075],
  [1.98, 0.1],
  [1.85, 0.125],
  [1.6, 0.15],
  [1.0, 0.16],
  [0.1, 0.143],
  [-1.3, 0.107],
  [-1.75, 0.088],
  [-1.92, 0.07],
  [-2.0, 0.045],
  [-2.04, 0.025],
];

export function plateThickness(y: number) {
  const pts = PLATE_THICKNESS;
  if (y >= pts[0]![0]) return pts[0]![1];
  for (let i = 1; i < pts.length; i++) {
    const [y1, t1] = pts[i]!;
    const [y0, t0] = pts[i - 1]!;
    if (y >= y1) return t1 + ((y - y1) / (y0 - y1)) * (t0 - t1);
  }
  return pts[pts.length - 1]![1];
}

/**
 * Upper mounting post: as in the photo, its edges are straight lines, not curves.
 * The underside runs straight down from the base to the face (about 40° below level);
 * the top shoulder runs straight up from the base into the leaning top section.
 * Steps that sit inside the base or the face body are hidden joins, and every corner
 * is kept at 90° or more (no sharp spikes) so the rounded edges stay clean.
 */
export const NECK_W = 0.6;
export const NECK_PROFILE: ProfileStep[] = [
  { to: [0.09, 1.053] },
  { to: [0.41, 0.781] },
  { to: [0.46, 0.781] },
  { to: [0.46, 1.2] },
  { to: [0.4, 1.6] },
  { to: [0.36, 1.96] },
  { to: [0.3, 1.96] },
  { to: [0.27, 1.913] },
  { to: [0.09, 1.792] },
  { to: [0.045, 1.63] },
  { to: [0.02, 1.63] },
  { to: [0.02, 1.257] },
  { to: [0.066, 1.257] },
];

/** Lower mounting post: its top and underside are straight lines sloping down from the base to the face. */
export const BLOCK_W = 0.56;
export const BLOCK_PROFILE: ProfileStep[] = [
  { to: [0.09, -0.381] },
  { to: [0.41, -0.538] },
  { to: [0.46, -0.538] },
  { to: [0.46, -1.36] },
  { to: [0.41, -1.363] },
  { to: [0.09, -1.186] },
  { to: [0.06, -1.08] },
  { to: [0.02, -1.08] },
  { to: [0.02, -0.25] },
  { to: [0.06, -0.25] },
];

/** Rounding radius of the posts' edges across their width. */
export const POST_ROUND = 0.05;
