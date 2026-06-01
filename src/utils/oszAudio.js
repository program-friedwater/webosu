const textDecoder = new TextDecoder("utf-8");

export async function extractAudioFromOsz(oszBlob) {
  const buffer = await oszBlob.arrayBuffer();
  const entries = readZipEntries(buffer);
  const osuEntry = entries.find((entry) => entry.name.toLowerCase().endsWith(".osu"));

  if (!osuEntry) {
    throw new Error("No .osu file found in .osz");
  }

  const osuText = textDecoder.decode(await inflateEntry(osuEntry, buffer));
  const audioFileName = parseOsuValue(osuText, "AudioFilename");
  const previewTime = Number(parseOsuValue(osuText, "PreviewTime"));

  if (!audioFileName) {
    throw new Error("No AudioFilename in .osu");
  }

  const audioEntry = findAudioEntry(entries, audioFileName);
  if (!audioEntry) {
    throw new Error(`Audio file not found: ${audioFileName}`);
  }

  const audioBytes = await inflateEntry(audioEntry, buffer);
  const mimeType = mimeTypeFor(audioEntry.name);
  return {
    blob: new Blob([audioBytes], { type: mimeType }),
    fileName: audioEntry.name,
    previewTimeMs: Number.isFinite(previewTime) && previewTime > 0 ? previewTime : 0,
  };
}

function readZipEntries(buffer) {
  const view = new DataView(buffer);
  const eocdOffset = findEndOfCentralDirectory(view);
  const centralDirectorySize = view.getUint32(eocdOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries = [];
  let offset = centralDirectoryOffset;
  const end = centralDirectoryOffset + centralDirectorySize;

  while (offset < end) {
    const signature = view.getUint32(offset, true);
    if (signature !== 0x02014b50) {
      break;
    }

    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buffer, offset + 46, nameLength);
    const name = textDecoder.decode(nameBytes);

    entries.push({
      name,
      method,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(view) {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      return offset;
    }
  }
  throw new Error("Invalid .osz zip");
}

async function inflateEntry(entry, buffer) {
  const view = new DataView(buffer, entry.localHeaderOffset);
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error(`Invalid zip entry: ${entry.name}`);
  }

  const nameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const dataOffset = entry.localHeaderOffset + 30 + nameLength + extraLength;
  const compressed = new Uint8Array(buffer, dataOffset, entry.compressedSize);

  if (entry.method === 0) {
    return compressed;
  }

  if (entry.method !== 8) {
    throw new Error(`Unsupported zip compression method ${entry.method}`);
  }

  if (!globalThis.DecompressionStream) {
    throw new Error("Browser cannot decompress .osz files");
  }

  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const decompressed = new Uint8Array(await new Response(stream).arrayBuffer());

  if (entry.uncompressedSize && decompressed.byteLength !== entry.uncompressedSize) {
    return decompressed;
  }

  return decompressed;
}

function parseOsuValue(osuText, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = osuText.match(new RegExp(`^${escaped}\\s*:\\s*(.+)$`, "im"));
  return match?.[1]?.trim();
}

function findAudioEntry(entries, audioFileName) {
  const target = normalizePath(audioFileName);
  return entries.find((entry) => normalizePath(entry.name) === target)
    ?? entries.find((entry) => normalizePath(entry.name).endsWith(`/${target}`))
    ?? entries.find((entry) => entry.name.toLowerCase().endsWith(".mp3"))
    ?? entries.find((entry) => entry.name.toLowerCase().endsWith(".ogg"));
}

function normalizePath(path) {
  return path.replaceAll("\\", "/").toLowerCase();
}

function mimeTypeFor(name) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".ogg")) {
    return "audio/ogg";
  }
  if (lower.endsWith(".wav")) {
    return "audio/wav";
  }
  return "audio/mpeg";
}
