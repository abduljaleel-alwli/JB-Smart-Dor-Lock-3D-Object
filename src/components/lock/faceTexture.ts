import * as THREE from "three";
import logoAsset from "@/assets/jb-access-logo.png.asset.json";

// Positions are fractions of the exterior face (v: 0 top → 1 bottom).
export const LAYOUT = {
  camera: 0.145,
  display: 0.211,
  rows: [0.307, 0.355, 0.4, 0.443],
  lock: 0.477,
  fingerprint: 0.565,
  handleTop: 0.725,
  handleBottom: 0.815,
  logo: 0.858,
  led: 0.895,
  topBend: 0.275,
  bottomBend: 0.9,
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
  ctx.shadowBlur = 15;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 4;
  ctx.fillStyle = "#e6f0ff";
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

/** Builds the exterior display, keypad, symbols, photographed logo and LED. */
export function createFaceTextures() {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext("2d")!;
  c.fillStyle = "#000";
  c.fillRect(0, 0, W, H);

  // Small status display under the camera module.
  const dy = LAYOUT.display * H;
  // The status display is unlit glass; it blends into the black face.
  glowText(c, "J.B", W / 2, dy - 24, 35, "#a9c9d7");
  c.font = "700 10px Arial";
  c.fillStyle = "#b8cbd3";
  c.fillText("A C C E S S", W / 2, dy + 2);
  c.font = "500 18px Arial";
  c.fillStyle = "#a9c1cb";
  c.fillText("2024-10-24  15:26", W / 2, dy + 35);
  c.strokeStyle = "#a9c1cb";
  c.lineWidth = 2;
  c.strokeRect(W * 0.68, dy - 43, 18, 10);
  c.fillRect(W * 0.68 + 18, dy - 40, 3, 4);

  // Smoked camera window above the status display (the flush lenses sit in it).
  const cy = LAYOUT.camera * H;
  c.fillStyle = "#0a0d10";
  c.strokeStyle = "#1c2228";
  c.lineWidth = 3;
  c.beginPath();
  c.roundRect(W * 0.2, cy - 52, W * 0.6, 104, 14);
  c.fill();
  c.stroke();

  const blue = "#2e7bff";
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "bell"],
  ];
  const sublabels: Record<string, string> = {
    "1": "ONE", "2": "TWO", "3": "THREE", "4": "FOUR", "5": "FIVE",
    "6": "SIX", "7": "SEVEN", "8": "EIGHT", "9": "NINE", "0": "ZERO",
  };
  const cols = [0.28, 0.5, 0.72];
  keys.forEach((row, r) =>
    row.forEach((key, i) => {
      const x = cols[i]! * W;
      const y = LAYOUT.rows[r]! * H;
      if (key === "*") {
        glowText(c, "✱", x, y, 54, "#ff3d9f");
      } else if (key === "bell") {
        c.strokeStyle = "#8de4ef";
        c.shadowColor = "#24b8e0";
        c.shadowBlur = 12;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(x - 21, y + 18);
        c.quadraticCurveTo(x - 19, y - 25, x, y - 28);
        c.quadraticCurveTo(x + 19, y - 25, x + 21, y + 18);
        c.closePath();
        c.stroke();
        c.beginPath();
        c.arc(x, y + 25, 5, 0, Math.PI * 2);
        c.stroke();
        // The photographed key carries a "#" inside the bell outline.
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(x - 6, y - 12); c.lineTo(x - 9, y + 10);
        c.moveTo(x + 7, y - 12); c.lineTo(x + 4, y + 10);
        c.moveTo(x - 13, y - 4); c.lineTo(x + 12, y - 4);
        c.moveTo(x - 14, y + 4); c.lineTo(x + 11, y + 4);
        c.stroke();
        c.shadowBlur = 0;
      } else {
        glowText(c, key, x, y - 5, 66, blue);
        c.font = "600 11px Arial";
        c.fillStyle = "#a8c9ef";
        c.fillText(sublabels[key] ?? "", x, y + 34);
      }
    }),
  );

  // NFC card target between the second and third rows.
  const ny = ((LAYOUT.rows[1]! + LAYOUT.rows[2]!) / 2) * H;
  c.strokeStyle = "#a8afb5";
  c.lineWidth = 3;
  c.strokeRect(W / 2 - 29, ny - 13, 58, 26);
  c.strokeRect(W / 2 - 20, ny - 6, 40, 12);
  c.font = "700 11px Arial";
  c.fillStyle = "#b5bbc0";
  c.fillText("CARD", W / 2, ny + 30);

  // Padlock status icon.
  const ly = LAYOUT.lock * H;
  c.strokeStyle = "#c3c8ca";
  c.lineWidth = 4;
  c.strokeRect(W / 2 - 15, ly - 4, 30, 26);
  c.beginPath();
  c.arc(W / 2, ly - 4, 10, Math.PI, 0);
  c.stroke();

  // The exact photographed product mark, placed as a flat original asset.
  const gy = LAYOUT.logo * H;
  const logo = new Image();
  logo.onload = () => {
    // Additive blend drops the logo's dark backdrop so only the mark shows.
    // Levels first: the photo's grey backdrop becomes pure black so no box shows.
    const tmp = document.createElement("canvas");
    tmp.width = 252;
    tmp.height = 148;
    const t = tmp.getContext("2d")!;
    t.drawImage(logo, 0, 0, 252, 148);
    const px = t.getImageData(0, 0, 252, 148);
    for (let i = 0; i < px.data.length; i += 4) {
      const lum = Math.max(px.data[i]!, px.data[i + 1]!, px.data[i + 2]!);
      const k = Math.max(0, Math.min(1, ((lum * px.data[i + 3]!) / 255 - 110) / 120));
      px.data[i] = px.data[i + 1] = px.data[i + 2] = 235 * k;
      px.data[i + 3] = 255;
    }
    t.putImageData(px, 0, 0);
    c.globalCompositeOperation = "lighter";
    c.drawImage(tmp, W / 2 - 126, gy - 79);
    c.globalCompositeOperation = "source-over";
    texture.needsUpdate = true;
  };
  logo.src = logoAsset.url;

  // Thin green status light immediately above the lower bend.
  const ey = LAYOUT.led * H;
  const gradient = c.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
  gradient.addColorStop(0, "rgba(40,255,140,0)");
  gradient.addColorStop(0.5, "rgba(80,255,160,1)");
  gradient.addColorStop(1, "rgba(40,255,140,0)");
  c.shadowColor = "#2bff8a";
  c.shadowBlur = 15;
  c.fillStyle = gradient;
  c.fillRect(W * 0.25, ey - 3, W * 0.5, 6);
  c.shadowBlur = 0;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
