export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function drawPill(ctx, rect, label, pointer, active = false) {
  const hover = hitRect(rect, pointer.x, pointer.y);
  ctx.fillStyle = active
    ? "rgba(255, 119, 211, 0.95)"
    : hover
      ? "rgba(255, 119, 211, 0.9)"
      : "rgba(255, 255, 255, 0.18)";
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, rect.w - 18);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

export function hitRect(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
