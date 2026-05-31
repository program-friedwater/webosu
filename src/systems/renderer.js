import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants.js";

export function createRenderer(canvas, ctx) {
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function logicalViewport() {
    const scale = Math.min(window.innerWidth / LOGICAL_WIDTH, window.innerHeight / LOGICAL_HEIGHT);
    const width = LOGICAL_WIDTH * scale;
    const height = LOGICAL_HEIGHT * scale;
    const x = (window.innerWidth - width) / 2;
    const y = (window.innerHeight - height) / 2;

    return { x, y, width, height, scale };
  }

  function toLogicalPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const viewport = logicalViewport();
    const cssX = event.clientX - rect.left;
    const cssY = event.clientY - rect.top;

    return {
      x: (cssX - viewport.x) / viewport.scale,
      y: (cssY - viewport.y) / viewport.scale,
    };
  }

  function drawInLogicalSpace(draw) {
    const viewport = logicalViewport();

    ctx.save();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = "#050508";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.scale, viewport.scale);
    draw();
    ctx.restore();
  }

  window.addEventListener("resize", resize);

  return {
    logicalWidth: LOGICAL_WIDTH,
    logicalHeight: LOGICAL_HEIGHT,
    resize,
    logicalViewport,
    toLogicalPoint,
    drawInLogicalSpace,
  };
}
