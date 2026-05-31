import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./constants.js";

export const pointer = {
  x: LOGICAL_WIDTH / 2,
  y: LOGICAL_HEIGHT / 2,
  down: false,
  inside: false,
};

export const app = {
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
  rawInputEnabled: false,
  rawInputLocked: false,
  beatmapQuery: "Still in my heart",
  beatmapResults: [],
  selectedRemoteBeatmap: 0,
  beatmapBrowserStatus: "Mirror: Hinamizawa",
  downloadedBeatmaps: [],
};
