// Renders the black PNG placeholder badge (transparent bg) to
// public/brand-assets/private-stock-black.png. Replace the PNG with the real
// Drive export (same filename) when it lands.
import { writeFile } from "node:fs/promises";
import { createCanvas } from "@napi-rs/canvas";

const S = 480, C = S / 2;
const canvas = createCanvas(S, S);
const ctx = canvas.getContext("2d");
ctx.strokeStyle = ctx.fillStyle = "#111111";

ctx.lineWidth = 10;
ctx.beginPath(); ctx.arc(C, C, 224, 0, Math.PI * 2); ctx.stroke();
ctx.lineWidth = 4; ctx.setLineDash([8, 12]);
ctx.beginPath(); ctx.arc(C, C, 200, 0, Math.PI * 2); ctx.stroke();
ctx.setLineDash([]);

function arcText(text, radius, centerAngle, size, flip = false) {
  ctx.font = `700 ${size}px "Arial Narrow", Arial, sans-serif`;
  const widths = [...text].map((ch) => ctx.measureText(ch).width + 6);
  const total = widths.reduce((a, b) => a + b, 0);
  let angle = centerAngle - ((flip ? -1 : 1) * total) / 2 / radius;
  [...text].forEach((ch, i) => {
    const a = angle + ((flip ? -1 : 1) * widths[i]) / 2 / radius;
    ctx.save();
    ctx.translate(C + radius * Math.cos(a), C + radius * Math.sin(a));
    ctx.rotate(a + (flip ? -Math.PI / 2 : Math.PI / 2));
    ctx.textAlign = "center";
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += ((flip ? -1 : 1) * widths[i]) / radius;
  });
}

arcText("PRIVATE STOCK", 160, -Math.PI / 2, 54);
arcText("CANNABIS CO.", 176, Math.PI / 2, 42, true);
ctx.font = '700 60px "Arial Narrow", Arial, sans-serif';
ctx.textAlign = "center";
ctx.fillText("EST.", C, C + 22);

await writeFile("public/brand-assets/private-stock-black.png", canvas.toBuffer("image/png"));
console.log("wrote public/brand-assets/private-stock-black.png");
