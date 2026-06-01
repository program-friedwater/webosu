import { downloadMirrorBeatmap } from "../providers/hinamizawaMirror.js";
import { extractAudioFromOsz } from "../utils/oszAudio.js";

export function createAudioPreview(app) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const context = AudioContextClass ? new AudioContextClass() : null;
  const gain = context?.createGain();
  const cache = new Map();
  let source = null;

  if (gain) {
    gain.gain.value = 0.45;
    gain.connect(context.destination);
  }

  function unlock() {
    if (context?.state === "suspended") {
      context.resume();
    }
  }

  async function playRemoteBeatmap(beatmap) {
    if (!beatmap) {
      stop();
      return;
    }

    if (!context || !gain) {
      app.previewStatus = "Web Audio is not available";
      return;
    }

    app.previewStatus = `Loading preview: ${beatmap.artist} - ${beatmap.title}`;
    app.previewingSetId = beatmap.setId;

    try {
      await context.resume();
      const preview = await getPreview(beatmap);
      stopSource();

      source = context.createBufferSource();
      source.buffer = preview.buffer;
      source.connect(gain);

      const offsetSeconds = Math.min(
        Math.max(0, preview.previewTimeMs / 1000),
        Math.max(0, preview.buffer.duration - 0.1),
      );
      source.start(0, offsetSeconds);
      app.previewStatus = `Playing preview: ${beatmap.artist} - ${beatmap.title}`;
    } catch (error) {
      app.previewStatus = error.message;
    }
  }

  function stop() {
    stopSource();
    app.previewingSetId = undefined;
    app.previewStatus = "";
  }

  function stopSource() {
    if (!source) {
      return;
    }

    try {
      source.stop();
    } catch {
      // Already stopped.
    }
    source.disconnect();
    source = null;
  }

  async function getPreview(beatmap) {
    if (cache.has(beatmap.setId)) {
      return cache.get(beatmap.setId);
    }

    const existing = app.downloadedBeatmaps.find((download) => download.setId === beatmap.setId);
    const oszBlob = existing?.blob ?? await downloadMirrorBeatmap(beatmap.setId);
    const audioData = await extractAudioFromOsz(oszBlob);
    const buffer = await context.decodeAudioData(await audioData.blob.arrayBuffer());
    const preview = {
      buffer,
      fileName: audioData.fileName,
      previewTimeMs: audioData.previewTimeMs,
    };

    cache.set(beatmap.setId, preview);
    return preview;
  }

  return {
    unlock,
    playRemoteBeatmap,
    stop,
  };
}
