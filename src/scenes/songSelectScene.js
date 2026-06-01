import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants.js";
import { songs } from "../data/songs.js";
import { downloadMirrorBeatmap, searchMirrorBeatmaps } from "../providers/hinamizawaMirror.js";
import { drawPill, hitRect, roundRect } from "../utils/canvas.js";
import { drawStableBackground } from "./shared.js";

const bottomButtons = {
  back: { x: 34, y: LOGICAL_HEIGHT - 65, w: 136, h: 44 },
  mods: { x: 188, y: LOGICAL_HEIGHT - 65, w: 136, h: 44 },
  rawInput: { x: 342, y: LOGICAL_HEIGHT - 65, w: 174, h: 44 },
  download: { x: 534, y: LOGICAL_HEIGHT - 65, w: 174, h: 44 },
  start: { x: LOGICAL_WIDTH - 228, y: LOGICAL_HEIGHT - 69, w: 194, h: 52 },
};

const searchControls = {
  query: { x: LOGICAL_WIDTH - 688, y: 20, w: 438, h: 38 },
  search: { x: LOGICAL_WIDTH - 236, y: 20, w: 92, h: 38 },
};

const detailDownload = { x: 70, y: 374, w: 210, h: 44 };

const modButtons = [
  { code: "HD", name: "Hidden", x: 72, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "HR", name: "Hard Rock", x: 204, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "DT", name: "Double Time", x: 336, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
  { code: "FL", name: "Flashlight", x: 468, y: LOGICAL_HEIGHT - 276, w: 118, h: 58 },
];

export function drawSongSelectScene(ctx, app, pointer) {
  drawStableBackground(ctx, app, "#141522", "#253e48");
  drawTopBar(ctx, app, pointer);
  drawSongList(ctx, app, pointer);
  drawSongDetails(ctx, app, pointer);
  drawModsPanel(ctx, app, pointer);
  drawBottomBar(ctx, app, pointer);
}

export async function handleSongSelectPointerUp(pointer, app, setScene, toggleRawInput, focusBeatmapSearch, playRemotePreview) {
  if (hitRect(searchControls.query, pointer.x, pointer.y)) {
    focusBeatmapSearch();
    return;
  }

  if (hitRect(searchControls.search, pointer.x, pointer.y)) {
    focusBeatmapSearch();
    await runMirrorSearch(app);
    return;
  }

  if (hitRect(bottomButtons.back, pointer.x, pointer.y)) {
    app.modsOpen = false;
    setScene("start");
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

  if (hitRect(bottomButtons.download, pointer.x, pointer.y) || hitRect(detailDownload, pointer.x, pointer.y)) {
    await downloadSelectedBeatmap(app);
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

  const resultIndex = songRowIndexAt(pointer.x, pointer.y, app);
  if (resultIndex < 0) {
    return;
  }

  if (hasRemoteResults(app)) {
    app.selectedRemoteBeatmap = resultIndex;
    await playRemotePreview(app.beatmapResults[resultIndex]);
  } else {
    app.selectedSong = resultIndex;
  }
}

export function handleSongSelectWheel(event, app) {
  if (app.scene !== "songSelect") {
    return false;
  }
  app.songScroll = Math.max(0, Math.min(90, app.songScroll + event.deltaY * 0.35));
  return true;
}

export function handleSongSelectKeyDown(event, app) {
  if (app.scene !== "songSelect") {
    return false;
  }

  if (event.key === "Enter") {
    runMirrorSearch(app);
    return true;
  }

  if (event.key === "Escape") {
    return true;
  }

  return false;
}

function drawTopBar(ctx, app, pointer) {
  ctx.fillStyle = "rgba(7, 8, 14, 0.56)";
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 78);
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = "800 32px Helvetica Neue, Arial, sans-serif";
  ctx.fillText("Song Select", 34, 47);
  ctx.font = "700 15px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText(statusLine(app), 34, 69);

  drawSearchInput(ctx, app, pointer);
  drawPill(ctx, searchControls.search, "Search", pointer);

  ctx.textAlign = "right";
  ctx.font = "800 25px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.fillText("mizosu!", LOGICAL_WIDTH - 34, 48);
  ctx.textAlign = "left";
}

function drawSearchInput(ctx, app, pointer) {
  const hover = hitRect(searchControls.query, pointer.x, pointer.y);
  ctx.fillStyle = hover ? "rgba(255, 255, 255, 0.18)" : "rgba(255, 255, 255, 0.12)";
  roundRect(ctx, searchControls.query.x, searchControls.query.y, searchControls.query.w, searchControls.query.h, 8);
  ctx.fill();

  ctx.fillStyle = app.beatmapQuery ? "#ffffff" : "rgba(255, 255, 255, 0.46)";
  ctx.font = "800 18px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(app.beatmapQuery || "Search ranked osu!std maps...", searchControls.query.x + 16, searchControls.query.y + 25, searchControls.query.w - 32);
}

function drawSongList(ctx, app, pointer) {
  const x = LOGICAL_WIDTH - 525;
  const y = 105;
  const rowHeight = 88;
  const remote = hasRemoteResults(app);
  const list = remote ? app.beatmapResults.slice(0, 5) : songs;

  ctx.save();
  ctx.fillStyle = "rgba(8, 9, 17, 0.5)";
  roundRect(ctx, x - 20, y - 18, 490, 552, 8);
  ctx.fill();

  list.forEach((item, index) => {
    const rowY = y + index * (rowHeight + 13) - app.songScroll;
    const selected = remote ? index === app.selectedRemoteBeatmap : index === app.selectedSong;
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

    drawSongRowText(ctx, item, remote, x, rowY);
  });
  ctx.restore();
}

function drawSongRowText(ctx, item, remote, x, rowY) {
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 23px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(remote ? item.title : item.title, x + 88, rowY + 33, 340);
  ctx.font = "600 15px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.fillText(remote ? `${item.artist} // ${item.creator}` : `${item.artist} // ${item.mapper}`, x + 88, rowY + 57, 340);
  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.fillText(remote ? `ranked osu!std // set ${item.setId}` : item.version, x + 88, rowY + 77, 340);
}

function drawSongDetails(ctx, app, pointer) {
  const remote = hasRemoteResults(app);
  const song = remote ? app.beatmapResults[app.selectedRemoteBeatmap] : songs[app.selectedSong];
  const x = 42;
  const y = 118;

  ctx.save();
  ctx.fillStyle = "rgba(7, 8, 14, 0.44)";
  roundRect(ctx, x, y, 620, 292, 8);
  ctx.fill();

  if (!song) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
    ctx.font = "800 24px Helvetica Neue, Arial, sans-serif";
    ctx.fillText("Search ranked osu!std maps", x + 26, y + 62);
    ctx.restore();
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 40px Helvetica Neue, Arial, sans-serif";
  ctx.fillText(song.title, x + 26, y + 62, 560);
  ctx.font = "700 24px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.74)";
  ctx.fillText(song.artist, x + 28, y + 98, 560);

  ctx.font = "700 18px Helvetica Neue, Arial, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  if (remote) {
    ctx.fillText(`mapped by ${song.creator}`, x + 28, y + 134, 560);
    ctx.fillText(`Set ID: ${song.setId}`, x + 28, y + 162);
    ctx.fillText(`Difficulties: ${song.difficultyCount || "unknown"}`, x + 28, y + 190);
    ctx.fillText(`Stars: ${formatStars(song)}`, x + 28, y + 218);
    ctx.fillText(`BPM: ${song.bpm ?? "unknown"}`, x + 28, y + 246);
    drawPill(ctx, detailDownload, "Download .osz", pointer);
  } else {
    ctx.fillText(`mapped by ${song.mapper}`, x + 28, y + 134);
    ctx.fillText(`[${song.version}]`, x + 28, y + 162);
    ctx.fillText(`${song.bpm} BPM    ${song.length}`, x + 28, y + 202);
    ctx.fillText(song.stats, x + 28, y + 230);
    ctx.fillStyle = "rgba(255, 120, 210, 0.78)";
    roundRect(ctx, x + 28, y + 242, 280, 7, 5);
    ctx.fill();
  }
  ctx.restore();
}

function drawBottomBar(ctx, app, pointer) {
  ctx.fillStyle = "rgba(7, 8, 14, 0.66)";
  ctx.fillRect(0, LOGICAL_HEIGHT - 86, LOGICAL_WIDTH, 86);
  drawPill(ctx, bottomButtons.back, "Back", pointer);
  drawPill(ctx, bottomButtons.mods, app.activeMods.size > 0 ? `Mods ${formatMods(app)}` : "Mods", pointer, app.modsOpen);
  drawPill(ctx, bottomButtons.rawInput, app.rawInputLocked ? "Raw Input *" : `Raw Input ${app.rawInputEnabled ? "On" : "Off"}`, pointer, app.rawInputEnabled);
  drawPill(ctx, bottomButtons.download, "Download", pointer, hasRemoteResults(app));
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

async function runMirrorSearch(app) {
  const query = app.beatmapQuery.trim();
  if (!query) {
    app.beatmapBrowserStatus = "Type a query first";
    app.beatmapResults = [];
    return;
  }

  app.beatmapBrowserStatus = "Searching Hinamizawa mirror...";
  try {
    app.beatmapResults = await searchMirrorBeatmaps(query);
    app.selectedRemoteBeatmap = 0;
    app.songScroll = 0;
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
    app.beatmapBrowserStatus = "Select a mirror result first";
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

function songRowIndexAt(x, y, app) {
  const startX = LOGICAL_WIDTH - 525;
  const startY = 105;
  const rowHeight = 88;
  const gap = 13;
  const count = hasRemoteResults(app) ? Math.min(5, app.beatmapResults.length) : songs.length;
  if (x < startX - 8 || x > startX + 456 || y < startY) {
    return -1;
  }

  const offset = y - startY + app.songScroll;
  const index = Math.floor(offset / (rowHeight + gap));
  const rowY = index * (rowHeight + gap);
  return index < count && offset >= rowY && offset <= rowY + rowHeight ? index : -1;
}

function hasRemoteResults(app) {
  return app.beatmapResults.length > 0;
}

function statusLine(app) {
  if (app.previewStatus) {
    return app.previewStatus;
  }
  if (app.beatmapBrowserStatus) {
    return app.beatmapBrowserStatus;
  }
  return "Ranked osu!std mirror search";
}

function formatMods(app) {
  return Array.from(app.activeMods).join("");
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
