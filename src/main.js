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
};

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
  const hover = logoHitTest(pointer.x, pointer.y);
  const pulse = Math.sin(app.time * 0.003) * 5;
  const press = pointer.down && hover ? -8 : 0;
  return {
    x: LOGICAL_WIDTH / 2,
    y: LOGICAL_HEIGHT / 2 - 12,
    radius: 132 + pulse + (hover ? 18 : 0) + press,
    hover,
  };
}

function logoHitTest(x, y) {
  const dx = x - LOGICAL_WIDTH / 2;
  const dy = y - (LOGICAL_HEIGHT / 2 - 12);
  return Math.hypot(dx, dy) <= 158;
}

function drawStartScene() {
  drawStableBackground("#11121f", "#3d294c");

  const orbitAlpha = 0.16 + Math.sin(app.time * 0.002) * 0.04;
  ctx.save();
  ctx.globalAlpha = orbitAlpha;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    ctx.beginPath();
    ctx.ellipse(
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT / 2 - 10,
      190 + i * 22,
      190 + i * 22,
      app.time * 0.0002 + i * 0.2,
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
  const glow = ctx.createRadialGradient(logo.x, logo.y, 30, logo.x, logo.y, logo.radius + 78);
  glow.addColorStop(0, "rgba(255, 118, 204, 0.64)");
  glow.addColorStop(0.46, "rgba(104, 207, 255, 0.2)");
  glow.addColorStop(1, "rgba(10, 12, 18, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius + 90, 0, Math.PI * 2);
  ctx.fill();

  const face = ctx.createRadialGradient(
    logo.x - logo.radius * 0.22,
    logo.y - logo.radius * 0.34,
    logo.radius * 0.08,
    logo.x,
    logo.y,
    logo.radius,
  );
  face.addColorStop(0, "#ffe4fb");
  face.addColorStop(0.22, "#ff85d5");
  face.addColorStop(0.64, "#d340a7");
  face.addColorStop(1, "#8f2b80");

  ctx.save();
  ctx.shadowColor = "rgba(255, 90, 202, 0.75)";
  ctx.shadowBlur = logo.hover ? 44 : 28;
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.lineWidth = 9;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius - 9, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
  ctx.beginPath();
  ctx.arc(logo.x, logo.y, logo.radius + 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "900 61px Helvetica Neue, Arial, sans-serif";
  ctx.shadowColor = "rgba(80, 12, 70, 0.62)";
  ctx.shadowBlur = 10;
  ctx.fillText("mizosu!", logo.x, logo.y - 8);
  ctx.font = "700 17px Helvetica Neue, Arial, sans-serif";
  ctx.globalAlpha = 0.88;
  ctx.fillText("click to enter", logo.x, logo.y + 56);
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
  drawPill(34, LOGICAL_HEIGHT - 65, 136, 44, "Back");
  drawPill(188, LOGICAL_HEIGHT - 65, 136, 44, "Mods");
  drawPill(LOGICAL_WIDTH - 228, LOGICAL_HEIGHT - 69, 194, 52, "Start");
}

function drawPill(x, y, w, h, label) {
  const hover = pointer.x >= x && pointer.x <= x + w && pointer.y >= y && pointer.y <= y + h;
  ctx.fillStyle = hover ? "rgba(255, 119, 211, 0.9)" : "rgba(255, 255, 255, 0.18)";
  roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Helvetica Neue, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
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
  updateTransition(dt);
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
