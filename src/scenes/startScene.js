import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants.js";
import { drawStableBackground } from "./shared.js";

export function logoHitTest(x, y) {
  const dx = x - LOGICAL_WIDTH / 2;
  const dy = y - (LOGICAL_HEIGHT / 2 - 12);
  return Math.hypot(dx, dy) <= 158;
}

function logoMetrics(app) {
  const pulse = Math.sin(app.time * 0.003) * 3.5;
  const hover = app.logoHover;
  const press = app.logoPress;
  return {
    x: LOGICAL_WIDTH / 2,
    y: LOGICAL_HEIGHT / 2 - 12,
    radius: 132 + pulse + hover * 22 - press * 9,
    hover,
    press,
  };
}

export function drawStartScene(ctx, app) {
  drawStableBackground(ctx, app, "#11121f", "#3d294c");

  const logo = logoMetrics(app);
  const orbitAlpha = 0.1 + logo.hover * 0.12 + Math.sin(app.time * 0.002) * 0.025;
  ctx.save();
  ctx.globalAlpha = orbitAlpha;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      logo.x,
      logo.y,
      185 + i * 22 + logo.hover * 13,
      185 + i * 22 + logo.hover * 13,
      app.time * 0.00026 + i * 0.22,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.restore();

  drawMizosuLogo(ctx, app);
  drawStartFooter(ctx);
}

function drawMizosuLogo(ctx, app) {
  const logo = logoMetrics(app);
  const glow = ctx.createRadialGradient(logo.x, logo.y, 40, logo.x, logo.y, logo.radius + 96);
  glow.addColorStop(0, `rgba(255, 112, 205, ${0.34 + logo.hover * 0.12})`);
  glow.addColorStop(0.52, `rgba(255, 112, 205, ${0.1 + logo.hover * 0.08})`);
  glow.addColorStop(1, "rgba(10, 12, 18, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius + 98, 0, Math.PI * 2);
  ctx.fill();

  const face = ctx.createLinearGradient(logo.x, logo.y - logo.radius, logo.x, logo.y + logo.radius);
  face.addColorStop(0, "#f257b8");
  face.addColorStop(1, "#b32f91");

  ctx.save();
  ctx.shadowColor = "rgba(255, 91, 205, 0.52)";
  ctx.shadowBlur = 20 + logo.hover * 18;
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.84)";
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius - 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius + 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(logo.x, logo.y);
  ctx.scale(1 + logo.hover * 0.035 - logo.press * 0.015, 1 + logo.hover * 0.035 - logo.press * 0.015);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 64px Helvetica Neue, Arial, sans-serif";
  ctx.shadowColor = "rgba(64, 8, 58, 0.68)";
  ctx.shadowBlur = 8;
  ctx.fillText("mizosu!", 0, -7);
  ctx.font = "800 15px Helvetica Neue, Arial, sans-serif";
  ctx.globalAlpha = 0.78 + logo.hover * 0.18;
  ctx.fillText(logo.hover > 0.5 ? "let's play" : "click to enter", 0, 54);
  ctx.restore();
}

function drawStartFooter(ctx) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.font = "600 18px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("single canvas client prototype", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 58);
  ctx.font = "500 14px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
  ctx.fillText("start screen and song select shell", LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 34);
  ctx.restore();
}
