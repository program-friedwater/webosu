const MIRROR_BASE = "https://mirror.hinamizawa.ai";

export async function searchMirrorBeatmaps(query) {
  const url = new URL("/api/v1/hinai/search", MIRROR_BASE);
  url.searchParams.set("query", query.trim());
  url.searchParams.set("mode", "0");
  url.searchParams.set("amount", "5");
  url.searchParams.set("sort", "plays_desc");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mirror search failed (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Mirror search returned an unexpected response");
  }

  return data.map(normalizeMirrorResult).filter(Boolean);
}

export async function downloadMirrorBeatmap(setId) {
  const url = new URL(`/api/v1/hinai/d/${setId}`, MIRROR_BASE);
  url.searchParams.set("noVideo", "1");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Mirror download failed (${response.status})`);
  }

  return response.blob();
}

function normalizeMirrorResult(result) {
  const setId = Number(result.SetID ?? result.set_id ?? result.id);
  if (!Number.isFinite(setId)) {
    return null;
  }

  const children = Array.isArray(result.ChildrenBeatmaps) ? result.ChildrenBeatmaps : [];
  const stars = children
    .map((beatmap) => Number(beatmap.DifficultyRating ?? beatmap.difficulty_rating ?? beatmap.stars))
    .filter(Number.isFinite);
  const bpm = Number(result.BPM ?? result.bpm);
  const rankedStatus = result.RankedStatus ?? result.status ?? "";

  return {
    setId,
    title: result.Title ?? result.title ?? "Unknown title",
    artist: result.Artist ?? result.artist ?? "Unknown artist",
    creator: result.Creator ?? result.creator ?? "Unknown creator",
    status: String(rankedStatus),
    bpm: Number.isFinite(bpm) ? bpm : undefined,
    difficultyCount: children.length,
    minStars: stars.length ? Math.min(...stars) : undefined,
    maxStars: stars.length ? Math.max(...stars) : undefined,
  };
}
