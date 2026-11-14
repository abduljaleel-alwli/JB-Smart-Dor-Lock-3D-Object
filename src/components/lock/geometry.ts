import * as THREE from "three";

export type Pt = [number, number, number]; // x, y, corner radius

/** Polygon with an independent radius at every corner. */
export function roundedPoly(pts: Pt[]) {
  const shape = new THREE.Shape();
  const n = pts.length;
  pts.forEach((point, i) => {
    const prev = pts[(i - 1 + n) % n]!;
    const next = pts[(i + 1) % n]!;
    const [x, y, radius] = point;
    const toPrev = new THREE.Vector2(prev[0] - x, prev[1] - y).normalize();
    const toNext = new THREE.Vector2(next[0] - x, next[1] - y).normalize();
    const a = [x + toPrev.x * radius, y + toPrev.y * radius];
    const b = [x + toNext.x * radius, y + toNext.y * radius];
    if (i === 0) shape.moveTo(a[0]!, a[1]!);
    else shape.lineTo(a[0]!, a[1]!);
    if (radius > 0) shape.quadraticCurveTo(x, y, b[0]!, b[1]!);
  });
  shape.closePath();
  return shape;
}

/** Deterministic fine paint grain for the door cutaway. */
export function createPaintTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e8e4dc";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 1500; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 39.3467) * 24634.6345) % 1;
    const alpha = 0.018 + (i % 4) * 0.006;
    ctx.fillStyle = i % 2 ? `rgba(255,255,255,${alpha})` : `rgba(70,62,52,${alpha})`;
    ctx.fillRect(Math.abs(x) * 128, Math.abs(y) * 128, 1, 1);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 8);
  return texture;
}
