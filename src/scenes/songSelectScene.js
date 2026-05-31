import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants.js";
import { songs } from "../data/songs.js";
import { downloadMirrorBeatmap, searchMirrorBeatmaps } from "../providers/hinamizawaMirror.js";
import { drawPill, hitRect, roundRect } from "../utils/canvas.js";
import { drawStableBackground } from "./shared.js";

const bottomButtons = {
  back: { x: 34, y: LOGICAL_HEIGHT - 65, w: 136, h: 44 },
  mods: { x: 188, y: LOGICAL_HEIGHT - 65, w: 136, h: 44 },
  rawInput: { x: 342, y: LOGICAL_HEIGHT - 65, w: 174, h: 44 },
  getMaps: { x: 534, y: LOGICAL_HEIGHT - 65, w: 154, h: 44 },
  start: { x: LOGICAL_WIDTH - 228, y: LOGICAL_HEIGHT - 69, w: 194, h: 52 },
};

const browserRects = {
  panel: { x: 116, y: 92, w: 1134, h: 584 },
  query: { x: 156, y: 160, w: 620, h: 52 },
  search: { x: 794, y: 160, w: 140, h: 52 },
  close: { x: 1120, y: 118, w: 90, h: 42 },
  download: { x: 982, y: 586, w: 208, h: 54 },
};

const modButtons = [
  { code: "HD", name: "Hidden", x: 72, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "HR", name: "Hard Rock", x: 204, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "DT", name: "Double Time", x: 336, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "FL", name: "Flashlight", x: 468, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
];

export function drawSongSelectScene(ctx, app, pointer) {
  drawStableBackground(ctx, app, "#141522", "#253e48");
  drawTopBar(ctx);
  drawSongList(ctx, app, pointer);
  drawSongDetails(ctx, app);
  drawModsPanel(ctx, app, pointer);
  drawBottomBar(ctx, app, pointer);
  drawBeatmapBrowser(ctx, app, pointer);
}

export async function handleSongSelectPointerUp(pointer, app, setScene, toggleRawInput, focusBeatmapSearch) {
  if (app.beatmapBrowserOpen) {
    await handleBeatmapBrowserPointerUp(pointer, app, focusBeatmapSearch);
    return;
  }

  if (hitRect(bottomButtons.back, pointer.x, pointer.y)) {
    app.modsOpen = false;
    setScene("start");
    return;
  }

  if (hitRect(bottomButtons.getMaps, pointer.x, pointer.y)) {
    app.modsOpen = false;
    app.beatmapBrowserOpen = true;
    if (app.beatmapResults.length === 0) {
      await runMirrorSearch(app);
    }
    focusBeatmapSearch();
    return;
  }

  if (hitRect(bottomButtons.mods, pointer.x, pointer.y)) {
    app.modsOpen = !app.modsOpen;
    return;
  }

  if (hitRect(bottomButtons.rawInput, pointer.x, pointer.y)) {
    toggleRawInput();
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

export function handleSongSelectWheel(event, app) {
  if (app.scene !== "songSelect") {
    return false;
  }
  app.songScroll = Math.max(0, Math.min(90, app.songScroll + event.deltaY * 0.35));
  return true;
}

export function handleSongSelectKeyDown(event, app) {
  if (app.scene !== "songSelect" || !app.beatmapBrowserOpen) {
    return false;
  }

  if (event.key === "Escape") {
    app.beatmapBrowserOpen = false;
    return true;
  }

  if (event.key === "Enter") {
    runMirrorSearch(app);
    return true;
  }

  if (event.target?.dataset?.mizosuTextInput === "beatmap-search") {
    return false;
  }

  if (event.key === "Backspace") {
    app.beatmapQuery = app.beatmapQuery.slice(0, -1);
    return true;
  }

  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    app.beatmapQuery = `${app.beatmapQuery}${event.key}`.slice(0, 72);
    return true;
  }

  return false;
}

function drawTopBar(ctx) {
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

function drawSongList(ctx, app, pointer) {
  const x = LOGICAL_WIDTH - 525;
  const y = 105;
  const rowHeight = 88;

  ctx.save();
  ctx.fillStyle = "rgba(8, 9, 17, 0.5)";
  roundRect(ctx, x - 20, y - 18, 490, 552, 8);
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
    roundRect(ctx, x - (selected ? 22 : 0), rowY, selected ? 478 : 456, rowHeight, 8);
    ctx.fill();

    ctx.fillStyle = selected ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.08)";
    roundRect(ctx, x + 14, rowY + 15, 58, 58, 6);
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

function drawSongDetails(ctx, app) {
  const song = songs[app.selectedSong];
  const x = 42;
  const y = 118;

  ctx.save();
  ctx.fillStyle = "rgba(7, 8, 14, 0.44)";
  roundRect(ctx, x, y, 590, 268, 8);
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
  roundRect(ctx, x + 28, y + 242, 280, 7, 5);
  ctx.fill();
  ctx.restore();
}

function drawBottomBar(ctx, app, pointer) {
  ctx.fillStyle = "rgba(7, 8, 14, 0.66)";
  ctx.fillRect(0, LOGICAL_HEIGHT - 86, LOGICAL_WIDTH, 86);
  drawPill(ctx, bottomButtons.back, "Back", pointer);
  drawPill(ctx, bottomButtons.mods, app.activeMods.size > 0 ? `Mods ${formatMods(app)}` : "Mods", pointer, app.modsOpen);
  drawPill(ctx, bottomButtons.rawInput, app.rawInputLocked ? "Raw Input *" : `Raw Input ${app.rawInputEnabled ? "On" : "Off"}`, pointer, app.rawInputEnabled);
  drawPill(ctx, bottomButtons.getMaps, "Get Maps", pointer, app.beatmapBrowserOpen);
  drawPill(ctx, bottomButtons.start, "Start", pointer);
}

function drawModsPanel(ctx, app, pointer) {
  if (!app.modsOpen) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(8, 9, 17, 0.72)";
  roundRect(ctx, 42, LOGICAL_HEIGHT - 340, 594, 230, 8);
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
    roundRect(ctx, mod.x, mod.y, mod.w, mod.h, 8);
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
  ctx.fillText(`Selected: ${formatMods(app) || "None"}`, 72, LOGICAL_HEIGHT - 148);
  ctx.restore();
}

function formatMods(app) {
  return Array.from(app.activeMods).join("");
}

async function handleBeatmapBrowserPointerUp(pointer, app, focusBeatmapSearch) {
  if (hitRect(browserRects.close, pointer.x, pointer.y)) {
    app.beatmapBrowserOpen = false;
    return;
  }

  if (hitRect(browserRects.query, pointer.x, pointer.y)) {
    focusBeatmapSearch();
    return;
  }

  if (hitRect(browserRects.search, pointer.x, pointer.y)) {
    focusBeatmapSearch();
    await runMirrorSearch(app);
    return;
  }

  if (hitRect(browserRects.download, pointer.x, pointer.y)) {
    await downloadSelectedBeatmap(app);
    return;
  }

  const resultIndex = resultIndexAt(pointer.x, pointer.y);
  if (resultIndex >= 0 && resultIndex < app.beatmapResults.length) {
    app.selectedRemoteBeatmap = resultIndex;
  }
}

async function runMirrorSearch(app) {
  const query = app.beatmapQuery.trim();
  if (!query) {
    app.beatmapBrowserStatus = "Type a query first";
    return;
  }

  app.beatmapBrowserStatus = "Searching Hinamizawa mirror...";
  try {
    app.beatmapResults = await searchMirrorBeatmaps(query);
    app.selectedRemoteBeatmap = 0;
    app.beatmapBrowserStatus = app.beatmapResults.length
      ? `${app.beatmapResults.length} ranked osu!std results from mirror`
      : "No mirror results";
  } catch (error) {
    app.beatmapResults = [];
    app.beatmapBrowserStatus = error.message;
  }
}

async function downloadSelectedBeatmap(app) {
  const beatmap = app.beatmapResults[app.selectedRemoteBeatmap];
  if (!beatmap) {
    app.beatmapBrowserStatus = "Select a beatmap first";
    return;
  }

  app.beatmapBrowserStatus = `Downloading set ${beatmap.setId}...`;
  try {
    const blob = await downloadMirrorBeatmap(beatmap.setId);
    app.downloadedBeatmaps.push({
      setId: beatmap.setId,
      title: beatmap.title,
      artist: beatmap.artist,
      creator: beatmap.creator,
      blob,
      downloadedAt: Date.now(),
    });
    app.beatmapBrowserStatus = `Downloaded ${beatmap.artist} - ${beatmap.title} (${formatBytes(blob.size)})`;
  } catch (error) {
    app.beatmapBrowserStatus = error.message;
  }
}

function drawBeatmapBrowser(ctx, app, pointer) {
  if (!app.beatmapBrowserOpen) {
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  ctx.fillStyle = "rgba(9, 10, 18, 0.94)";
  roundRect(ctx, browserRects.panel.x, browserRects.panel.y, browserRects.panel.w, browserRects.panel.h, 8);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "900 32px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("Get Maps", 156, 132);
  ctx.font = "700 14px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.fillText("Hinamizawa mirror search: Ranked osu!std only. Press Enter to search, Esc to close.", 156, 150);

  drawTextBox(ctx, browserRects.query, app.beatmapQuery, pointer);
  drawPill(ctx, browserRects.search, "Search", pointer);
  drawPill(ctx, browserRects.close, "Close", pointer);
  drawMirrorResults(ctx, app, pointer);
  drawRemoteDetails(ctx, app, pointer);

  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.font = "700 15px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(app.beatmapBrowserStatus, 156, 640, 780);
  ctx.restore();
}

function drawTextBox(ctx, rect, value, pointer) {
  const hover = hitRect(rect, pointer.x, pointer.y);
  ctx.fillStyle = hover ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.12)";
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 22px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(value || "Search beatmaps...", rect.x + 18, rect.y + 34, rect.w - 36);
}

function drawMirrorResults(ctx, app, pointer) {
  const x = 156;
  const y = 236;
  const w = 620;
  const rowHeight = 62;

  app.beatmapResults.slice(0, 5).forEach((beatmap, index) => {
    const row = { x, y: y + index * (rowHeight + 8), w, h: rowHeight };
    const selected = index === app.selectedRemoteBeatmap;
    const hover = hitRect(row, pointer.x, pointer.y);

    ctx.fillStyle = selected
      ? "rgba(255, 104, 205, 0.82)"
      : hover
        ? "rgba(255, 255, 255, 0.18)"
        : "rgba(255, 255, 255, 0.09)";
    roundRect(ctx, row.x, row.y, row.w, row.h, 8);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "800 19px Helvetica Neue, Arial, sans-serif";
    ctx.fillText(`${beatmap.artist} - ${beatmap.title}`, row.x + 18, row.y + 25, row.w - 36);
    ctx.font = "700 13px Helvetica Neue, Arial, sans-serif";
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.fillText(`mapped by ${beatmap.creator}  //  set ${beatmap.setId}`, row.x + 18, row.y + 47, row.w - 36);
  });
}

function drawRemoteDetails(ctx, app, pointer) {
  const beatmap = app.beatmapResults[app.selectedRemoteBeatmap];
  const x = 820;
  const y = 236;

  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  roundRect(ctx, x, y, 370, 310, 8);
  ctx.fill();

  if (!beatmap) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
    ctx.font = "800 20px Helvetica Neue, Arial, sans-serif";
    ctx.fillText("No beatmap selected", x + 24, y + 44);
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 28px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(beatmap.title, x + 24, y + 48, 320);
  ctx.font = "800 19px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.fillText(beatmap.artist, x + 24, y + 82, 320);

  ctx.font = "700 16px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.fillText(`Creator: ${beatmap.creator}`, x + 24, y + 126, 320);
  ctx.fillText(`Set ID: ${beatmap.setId}`, x + 24, y + 154);
  ctx.fillText(`Difficulties: ${beatmap.difficultyCount || "unknown"}`, x + 24, y + 182);
  ctx.fillText(`Stars: ${formatStars(beatmap)}`, x + 24, y + 210);
  ctx.fillText(`BPM: ${beatmap.bpm ?? "unknown"}`, x + 24, y + 238);

  drawPill(ctx, browserRects.download, "Download .osz", pointer);
}

function resultIndexAt(x, y) {
  const startX = 156;
  const startY = 236;
  const rowHeight = 62;
  const gap = 8;
  if (x < startX || x > startX + 620 || y < startY) {
    return -1;
  }

  const offset = y - startY;
  const index = Math.floor(offset / (rowHeight + gap));
  const rowY = index * (rowHeight + gap);
  return index < 5 && offset >= rowY && offset <= rowY + rowHeight ? index : -1;
}

function formatStars(beatmap) {
  if (!Number.isFinite(beatmap.minStars) || !Number.isFinite(beatmap.maxStars)) {
    return "unknown";
  }
  if (beatmap.minStars === beatmap.maxStars) {
    return beatmap.minStars.toFixed(2);
  }
  return `${beatmap.minStars.toFixed(2)} - ${beatmap.maxStars.toFixed(2)}`;
}

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
