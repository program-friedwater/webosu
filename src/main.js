import { createInput } from "./systems/input.js";
import { createRenderer } from "./systems/renderer.js";
import { app, pointer } from "./state.js";
import { drawStartScene, logoHitTest } from "./scenes/startScene.js";
import {
  drawSongSelectScene,
  handleSongSelectKeyDown,
  handleSongSelectPointerUp,
  handleSongSelectWheel,
} from "./scenes/songSelectScene.js";
import { approach } from "./utils/math.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const renderer = createRenderer(canvas, ctx);
const input = createInput(canvas, pointer, app, renderer);

function setScene(scene) {
  app.targetScene = scene;
  app.transition = 1;
}

function updateTransition(dt) {
  if (app.transition <= 0) {
    return;
  }

  app.transition -= dt / 520;
  if (app.transition <= 0.48 && app.targetScene) {
    app.scene = app.targetScene;
    app.targetScene = null;
  }
  if (app.transition < 0) {
    app.transition = 0;
  }
}

function drawTransition() {
  if (app.transition <= 0) {
    return;
  }

  const alpha = 1 - Math.abs(app.transition - 0.5) * 2;
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, renderer.logicalWidth, renderer.logicalHeight);
}

function drawCursor() {
  if (!pointer.inside) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = app.rawInputEnabled ? "rgba(125, 231, 255, 0.92)" : "rgba(255, 255, 255, 0.86)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, pointer.down ? 13 : 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = app.rawInputEnabled ? "rgba(125, 231, 255, 0.42)" : "rgba(255, 113, 205, 0.4)";
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function update(dt) {
  app.time += dt;

  const logoHovered = app.scene === "start" && logoHitTest(pointer.x, pointer.y);
  const logoPressed = logoHovered && pointer.down;
  app.logoHover = approach(app.logoHover, logoHovered ? 1 : 0, dt, logoHovered ? 11 : 8);
  app.logoPress = approach(app.logoPress, logoPressed ? 1 : 0, dt, logoPressed ? 18 : 14);

  updateTransition(dt);
  window.__mizosuState = {
    scene: app.scene,
    modsOpen: app.modsOpen,
    activeMods: Array.from(app.activeMods),
    selectedSong: app.selectedSong,
    logoHover: app.logoHover,
    rawInputEnabled: app.rawInputEnabled,
    rawInputLocked: app.rawInputLocked,
    beatmapBrowserOpen: app.beatmapBrowserOpen,
    beatmapQuery: app.beatmapQuery,
    beatmapResults: app.beatmapResults.length,
    downloadedBeatmaps: app.downloadedBeatmaps.length,
  };
}

function draw() {
  renderer.drawInLogicalSpace(() => {
    if (app.scene === "start") {
      drawStartScene(ctx, app);
    } else {
      drawSongSelectScene(ctx, app, pointer);
    }

    drawTransition();
    drawCursor();
  });
}

function frame(now) {
  const dt = Math.min(50, now - app.lastTime);
  app.lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointerup", async (event) => {
  input.updatePointerFromEvent(event);
  pointer.down = false;

  if (app.scene === "start" && logoHitTest(pointer.x, pointer.y)) {
    setScene("songSelect");
    return;
  }

  if (app.scene === "songSelect") {
    await handleSongSelectPointerUp(pointer, app, setScene, () => input.toggleRawInput());
  }
});

window.addEventListener("keydown", (event) => {
  if (handleSongSelectKeyDown(event, app)) {
    event.preventDefault();
  }
});

canvas.addEventListener("wheel", (event) => {
  if (handleSongSelectWheel(event, app)) {
    event.preventDefault();
  }
}, { passive: false });

renderer.resize();
requestAnimationFrame(frame);
