import * as THREE from "three";

// Positions are fractions of the front panel (u: 0 left → 1 right, v: 0 top → 1 bottom).
export const LAYOUT = {
  camera: 0.125,
  display: 0.175,
  rows: [0.27, 0.325, 0.38, 0.435],
  lock: 0.475,
  fingerprint: 0.555,
  handleTop: 0.76,
  handleBottom: 0.86,
  logo: 0.915,
  led: 0.955,
};

const W = 512;
const H = 2986;

function glowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.font = `500 ${size}px "Helvetica Neue", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 6;
  ctx.fillStyle = "#e6f0ff";
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/** Builds the emissive face graphics: display, keypad legends, icons, logo, LED. */
export function createFaceTextures() {
  const color = document.createElement("canvas");
  color.width = W;
  color.height = H;
  const c = color.getContext("2d")!;
  c.fillStyle = "#000";
  c.fillRect(0, 0, W, H);

  // Display
  const dy = LAYOUT.display * H;
  c.fillStyle = "#02060d";
  c.fillRect(W * 0.2, dy - 55, W * 0.6, 110);
  glowText(c, "J.B", W / 2, dy - 18, 40, "#8fc4ff");
  c.font = "500 22px Arial";
  c.fillStyle = "#9fd0ff";
  c.fillText("2024-01-08   12:42", W / 2, dy + 28);
  c.fillRect(W * 0.66, dy - 32, 22, 12);

  // Keypad
  const blue = "#2e7bff";
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "bell"],
  ];
  const cols = [0.28, 0.5, 0.72];
  keys.forEach((row, r) =>
    row.forEach((k, i) => {
      const x = cols[i] * W;
      const y = LAYOUT.rows[r] * H;
      if (k === "*") glowText(c, "✱", x, y, 64, "#ff3df0");
      else if (k === "bell") {
        c.strokeStyle = "#cfe3ff";
        c.shadowColor = blue;
        c.shadowBlur = 16;
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x - 24, y + 22);
        c.quadraticCurveTo(x - 22, y - 30, x, y - 30);
        c.quadraticCurveTo(x + 22, y - 30, x + 24, y + 22);
        c.closePath();
        c.stroke();
        c.beginPath();
        c.arc(x, y + 30, 6, 0, Math.PI * 2);
        c.stroke();
        c.shadowBlur = 0;
      } else glowText(c, k, x, y, 78, blue);
    }),
  );

  // NFC card symbol between rows 2 and 3
  const ny = (LAYOUT.rows[1] + LAYOUT.rows[2]) / 2 * H;
  c.strokeStyle = "#9fb8d8";
  c.lineWidth = 4;
  c.strokeRect(W / 2 - 34, ny - 14, 68, 28);
  c.strokeRect(W / 2 - 22, ny - 6, 44, 12);

  // Padlock
  const ly = LAYOUT.lock * H;
  c.strokeStyle = "#e8eef8";
  c.lineWidth = 5;
  c.strokeRect(W / 2 - 18, ly - 6, 36, 30);
  c.beginPath();
  c.arc(W / 2, ly - 6, 12, Math.PI, 0);
  c.stroke();

  // Logo
  const gy = LAYOUT.logo * H;
  c.textAlign = "center";
  c.fillStyle = "#d9dde3";
  c.font = "italic 800 84px Georgia, serif";
  c.fillText("J.B", W / 2, gy - 18);
  c.font = "700 28px Arial";
  c.fillText("A C C E S S", W / 2, gy + 42);

  // Green LED strip
  const ey = LAYOUT.led * H;
  const g = c.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  g.addColorStop(0, "rgba(40,255,140,0)");
  g.addColorStop(0.5, "rgba(80,255,160,1)");
  g.addColorStop(1, "rgba(40,255,140,0)");
  c.shadowColor = "#2bff8a";
  c.shadowBlur = 20;
  c.fillStyle = g;
  c.fillRect(W * 0.25, ey - 4, W * 0.5, 8);
  c.shadowBlur = 0;

  const tex = new THREE.CanvasTexture(color);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
