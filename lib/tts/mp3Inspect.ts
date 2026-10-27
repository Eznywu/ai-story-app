export type Mp3Inspection = {
  valid: boolean;
  truncated: boolean;
  durationMs: number;
  frames: number;
  leftoverBytes: number;
  notes: string;
};

const BITRATE_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATE_V2_L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
const SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000],
  2: [22050, 24000, 16000],
  0: [11025, 12000, 8000],
};

export function inspectMp3(audio: Buffer): Mp3Inspection {
  if (!audio.length) {
    return { valid: false, truncated: true, durationMs: 0, frames: 0, leftoverBytes: 0, notes: "The audio file is empty." };
  }
  let offset = id3v2End(audio);
  let frames = 0;
  let samples = 0;
  let sampleRate = 0;
  let truncated = false;

  while (offset + 4 <= audio.length) {
    if (audio[offset] === 0x54 && audio.toString("latin1", offset, offset + 3) === "TAG" && audio.length - offset === 128) {
      offset = audio.length;
      break;
    }
    if (audio[offset] !== 0xff || (audio[offset + 1] & 0xe0) !== 0xe0) break;
    const header = audio.readUInt32BE(offset);
    const versionBits = (header >> 19) & 0x3;
    const layerBits = (header >> 17) & 0x3;
    const bitrateIndex = (header >> 12) & 0xf;
    const sampleIndex = (header >> 10) & 0x3;
    const padding = (header >> 9) & 0x1;
    if (versionBits === 1 || layerBits === 0 || bitrateIndex === 0 || bitrateIndex === 15 || sampleIndex === 3) break;
    const layer = layerBits === 1 ? 3 : layerBits === 2 ? 2 : 1;
    const rates = SAMPLE_RATES[versionBits];
    const rate = rates[sampleIndex];
    const bitrateKbps = layer === 3 && versionBits !== 3 ? BITRATE_V2_L3[bitrateIndex] : BITRATE_V1_L3[bitrateIndex];
    if (!rate || !bitrateKbps) break;
    const bitrate = bitrateKbps * 1000;
    let frameLength = 0;
    let frameSamples = 1152;
    if (layer === 3) {
      const coeff = versionBits === 3 ? 144 : 72;
      frameLength = Math.floor((coeff * bitrate) / rate) + padding;
      frameSamples = versionBits === 3 ? 1152 : 576;
    } else if (layer === 2) {
      frameLength = Math.floor((144 * bitrate) / rate) + padding;
      frameSamples = 1152;
    } else {
      frameLength = Math.floor(((12 * bitrate) / rate + padding) * 4);
      frameSamples = 384;
    }
    if (frameLength < 4) break;
    if (offset + frameLength > audio.length) {
      truncated = true;
      break;
    }
    frames += 1;
    samples += frameSamples;
    sampleRate = rate;
    offset += frameLength;
  }

  const leftoverBytes = Math.max(0, audio.length - offset);
  if (leftoverBytes > 16) truncated = true;
  const durationMs = sampleRate ? Math.round((samples / sampleRate) * 1000) : 0;
  const valid = frames > 0 && !truncated && durationMs > 0;
  const notes = valid
    ? `Decoded ${frames} MP3 frames, about ${durationMs} ms.`
    : truncated
      ? "The MP3 ended before a frame finished. This looks truncated."
      : "The file could not be decoded as MP3.";
  return { valid, truncated, durationMs, frames, leftoverBytes, notes };
}

export function concatMp3(parts: Buffer[]): Buffer {
  const usable = parts.filter((part) => part.length > 0);
  if (!usable.length) return Buffer.alloc(0);
  const chunks = [Buffer.from(usable[0])];
  for (let i = 1; i < usable.length; i += 1) {
    const start = id3v2End(usable[i]);
    chunks.push(Buffer.from(usable[i].subarray(start)));
  }
  return Buffer.concat(chunks);
}

function id3v2End(audio: Buffer): number {
  if (audio.length < 10) return 0;
  if (audio.toString("latin1", 0, 3) !== "ID3") return 0;
  const size = synchsafe(audio, 6);
  const footer = audio[5] & 0x10 ? 10 : 0;
  const end = 10 + size + footer;
  return end > 0 && end < audio.length ? end : 0;
}

function synchsafe(audio: Buffer, offset: number): number {
  return ((audio[offset] & 0x7f) << 21) | ((audio[offset + 1] & 0x7f) << 14) | ((audio[offset + 2] & 0x7f) << 7) | (audio[offset + 3] & 0x7f);
}
