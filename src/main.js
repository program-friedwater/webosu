const LOGICAL_WIDTH = 1366;
const LOGICAL_HEIGHT = 768;

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const pointer = {
  x: LOGICAL_WIDTH / 2,
  y: LOGICAL_HEIGHT / 2,
  down: false,
  inside: false,
};

const app = {
  scene: "start",
  transition: 0,
  targetScene: null,
  time: 0,
  lastTime: performance.now(),
  songScroll: 0,
  selectedSong: 1,
  modsOpen: false,
  activeMods: new Set(),
  logoHover: 0,
  logoPress: 0,
};

const bottomButtons = {
  back: { x: 34, y: LOGICAL_HEIGHT - 65, w: 136, h: 44 },
  mods: { x: 188, y: LOGICAL_HEIGHT - 65, w: 136, h: 44 },
  start: { x: LOGICAL_WIDTH - 228, y: LOGICAL_HEIGHT - 69, w: 194, h: 52 },
};

const modButtons = [
  { code: "HD", name: "Hidden", x: 72, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "HR", name: "Hard Rock", x: 204, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "DT", name: "Double Time", x: 336, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "FL", name: "Flashlight", x: 468, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
];

const songs = [
  {
    title: "cyanotype skyline",
    artist: "mizosu project",
    mapper: "agemizu",
    version: "insane",
    bpm: 174,
    length: "02:11",
    stats: "AR 9.2  OD 8.5  CS 4.0  HP 6.5",
  },
  {
    title: "afterimage circuit",
    artist: "stable lab",
    mapper: "canvas",
    version: "hard",
    bpm: 152,
    length: "01:48",
    stats: "AR 8.0  OD 7.2  CS 4.0  HP 5.0",
  },
  {
    title: "moonlit latency",
    artist: "web audio",
    mapper: "prototype",
    version: "normal",
    bpm: 128,
    length: "02:34",
    stats: "AR 6.5  OD 6.0  CS 3.8  HP 4.0",
  },
  {
    title: "glass cursor",
    artist: "single canvas",
    mapper: "runtime",
    version: "expert",
    bpm: 190,
    length: "02:02",
    stats: "AR 9.6  OD 8.8  CS 4.2  HP 7.0",
  },
];

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

function setScene(scene) {
  app.targetScene = scene;
  app.transition = 1;
}

function hitRect(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function approach(current, target, dt, speed) {
  return current + (target - current) * (1 - Math.exp(-speed * dt / 1000));
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

function logoMetrics() {
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

function logoHitTest(x, y) {
  const dx = x - LOGICAL_WIDTH / 2;
  const dy = y - (LOGICAL_HEIGHT / 2 - 12);
  return Math.hypot(dx, dy) <= 158;
}

function drawStartScene() {
  drawStableBackground("#11121f", "#3d294c");

  const logo = logoMetrics();
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

  drawMizosuLogo();
  drawStartFooter();
}

function drawMizosuLogo() {
  const logo = logoMetrics();
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

function drawStartFooter() {
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

function drawSongSelectScene() {
  drawStableBackground("#141522", "#253e48");
  drawTopBar();
  drawSongList();
  drawSongDetails();
  drawModsPanel();
  drawBottomBar();
}

function drawStableBackground(top, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, LOGICAL_HEIGHT);
  gradient.addColorStop(0, top);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 44; i += 1) {
    const x = (i * 191 + app.time * 0.016) % (LOGICAL_WIDTH + 160) - 80;
    const y = (i * 83) % LOGICAL_HEIGHT;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(0, 0, 0, 0.26)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

function drawTopBar() {
  ctx.fillStyle = "rgba(7, 8, 14, 0.56)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 78);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = "800 32px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("Song Select", 34, 47);
  ctx.font = "700 15px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText("Group: All Songs    Sort: Title    Search: type to search", 34, 69);

  ctx.textAlign = "right";
  ctx.font = "800 25px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("mizosu!", LOGICAL_WIDTH - 34, 48);
  ctx.textAlign = "left";
}

function drawSongList() {
  const x = LOGICAL_WIDTH - 525;
  const y = 105;
  const rowHeight = 88;

  ctx.save();
  ctx.fillStyle = "rgba(8, 9, 17, 0.5)";
  roundRect(x - 20, y - 18, 490, 552, 8);
  ctx.fill();

  songs.forEach((song, index) => {
    const rowY = y + index * (rowHeight + 13) - app.songScroll;
    const selected = index === app.selectedSong;
    const hover = pointer.x >= x - 8 && pointer.x <= x + 456 && pointer.y >= rowY && pointer.y <= rowY + rowHeight;

    ctx.fillStyle = selected
      ? "rgba(255, 104, 205, 0.82)"
      : hover
        ? "rgba(255, 255, 255, 0.2)"
        : "rgba(255, 255, 255, 0.11)";
    roundRect(x - (selected ? 22 : 0), rowY, selected ? 478 : 456, rowHeight, 8);
    ctx.fill();

    ctx.fillStyle = selected ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.08)";
    roundRect(x + 14, rowY + 15, 58, 58, 6);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 23px Helvetica Neue, Arial, sans-serif";
    ctx.fillText(song.title, x + 88, rowY + 33);
    ctx.font = "600 15px Helvetica Neue, Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
    ctx.fillText(`${song.artist} // ${song.mapper}`, x + 88, rowY + 57);
    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    ctx.fillText(song.version, x + 88, rowY + 77);
  });
  ctx.restore();
}

function drawSongDetails() {
  const song = songs[app.selectedSong];
  const x = 42;
  const y = 118;

  ctx.save();
  ctx.fillStyle = "rgba(7, 8, 14, 0.44)";
  roundRect(x, y, 590, 268, 8);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 43px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(song.title, x + 26, y + 62);
  ctx.font = "700 24px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
  ctx.fillText(song.artist, x + 28, y + 98);

  ctx.font = "700 18px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.fillText(`mapped by ${song.mapper}`, x + 28, y + 134);
  ctx.fillText(`[${song.version}]`, x + 28, y + 162);
  ctx.fillText(`${song.bpm} BPM    ${song.length}`, x + 28, y + 202);
  ctx.fillText(song.stats, x + 28, y + 230);

  ctx.fillStyle = "rgba(255, 120, 210, 0.78)";
  roundRect(x + 28, y + 242, 280, 7, 5);
  ctx.fill();
  ctx.restore();
}

function drawBottomBar() {
  ctx.fillStyle = "rgba(7, 8, 14, 0.66)";
  ctx.fillRect(0, LOGICAL_HEIGHT - 86, LOGICAL_WIDTH, 86);
  drawPill(bottomButtons.back, "Back");
  drawPill(bottomButtons.mods, app.activeMods.size > 0 ? `Mods ${formatMods()}` : "Mods", app.modsOpen);
  drawPill(bottomButtons.start, "Start");
}

function drawPill(rect, label, active = false) {
  const hover = hitRect(rect, pointer.x, pointer.y);
  ctx.fillStyle = active
    ? "rgba(255, 119, 211, 0.95)"
    : hover
      ? "rgba(255, 119, 211, 0.9)"
      : "rgba(255, 255, 255, 0.18)";
  roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, rect.w - 18);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawModsPanel() {
  if (!app.modsOpen) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(8, 9, 17, 0.72)";
  roundRect(42, LOGICAL_HEIGHT - 340, 594, 230, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.font = "900 28px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("Mods", 72, LOGICAL_HEIGHT - 294);
  ctx.font = "600 15px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.fillText("Pick modifiers for this song", 72, LOGICAL_HEIGHT - 258);

  modButtons.forEach((mod) => {
    const active = app.activeMods.has(mod.code);
    const hover = hitRect(mod, pointer.x, pointer.y);
    ctx.fillStyle = active
      ? "rgba(255, 116, 207, 0.86)"
      : hover
        ? "rgba(255, 255, 255, 0.22)"
        : "rgba(255, 255, 255, 0.12)";
    roundRect(mod.x, mod.y, mod.w, mod.h, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "900 25px Helvetica Neue, Arial, sans-serif";
    ctx.fillText(mod.code, mod.x + mod.w / 2, mod.y + 28);
    ctx.font = "700 11px Helvetica Neue, Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
    ctx.fillText(mod.name, mod.x + mod.w / 2, mod.y + 47);
    ctx.textAlign = "left";
  });

  ctx.font = "700 15px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.64)";
  ctx.fillText(`Selected: ${formatMods() || "None"}`, 72, LOGICAL_HEIGHT - 148);
  ctx.restore();
}

function formatMods() {
  return Array.from(app.activeMods).join("");
}

function drawCursor() {
  if (!pointer.inside) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.86)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, pointer.down ? 13 : 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 113, 205, 0.4)";
  ctx.beginPath();
  ctx.arc(pointer.x, pointer.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTransition() {
  if (app.transition <= 0) {
    return;
  }

  const alpha = 1 - Math.abs(app.transition - 0.5) * 2;
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
  };
}

function draw() {
  drawInLogicalSpace(() => {
    if (app.scene === "start") {
      drawStartScene();
    } else {
      drawSongSelectScene();
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

window.addEventListener("resize", resize);

canvas.addEventListener("pointerenter", () => {
  pointer.inside = true;
});

canvas.addEventListener("pointerleave", () => {
  pointer.inside = false;
  pointer.down = false;
});

canvas.addEventListener("pointermove", (event) => {
  const point = toLogicalPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
});

canvas.addEventListener("pointerdown", (event) => {
  const point = toLogicalPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
  pointer.down = true;
});

canvas.addEventListener("pointerup", (event) => {
  const point = toLogicalPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
  pointer.down = false;

  if (app.scene === "start" && logoHitTest(pointer.x, pointer.y)) {
    setScene("songSelect");
  }

  if (app.scene === "songSelect") {
    if (hitRect(bottomButtons.back, pointer.x, pointer.y)) {
      app.modsOpen = false;
      setScene("start");
      return;
    }

    if (hitRect(bottomButtons.mods, pointer.x, pointer.y)) {
      app.modsOpen = !app.modsOpen;
      return;
    }

    if (app.modsOpen) {
      for (const mod of modButtons) {
        if (hitRect(mod, pointer.x, pointer.y)) {
          if (app.activeMods.has(mod.code)) {
            app.activeMods.delete(mod.code);
          } else {
            app.activeMods.add(mod.code);
          }
          return;
        }
      }
    }

    const listX = LOGICAL_WIDTH - 525;
    const listY = 105;
    const rowHeight = 88;
    songs.forEach((_, index) => {
      const rowY = listY + index * (rowHeight + 13) - app.songScroll;
      if (pointer.x >= listX - 8 && pointer.x <= listX + 456 && pointer.y >= rowY && pointer.y <= rowY + rowHeight) {
        app.selectedSong = index;
      }
    });
  }
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    if (app.scene !== "songSelect") {
      return;
    }
    app.songScroll = Math.max(0, Math.min(90, app.songScroll + event.deltaY * 0.35));
  },
  { passive: false },
);

resize();
requestAnimationFrame(frame);
