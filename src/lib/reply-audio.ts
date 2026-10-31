/** Bounded PCM WAV is portable and lets the server verify duration before billing. */
export const REPLY_AUDIO_RATE = 16000;
export const REPLY_AUDIO_MAX_SECONDS = 45;
export const REPLY_AUDIO_MAX_BYTES = 44 + REPLY_AUDIO_RATE * REPLY_AUDIO_MAX_SECONDS * 2;
export const REPLY_AUDIO_CONSENT = "recorded-reply-v1";

export function encodeReplyWav(
  audio: Pick<AudioBuffer, "sampleRate" | "length" | "numberOfChannels" | "getChannelData">,
): ArrayBuffer {
  if (
    !Number.isFinite(audio.sampleRate) ||
    audio.sampleRate < 8000 ||
    audio.sampleRate > 192000 ||
    audio.numberOfChannels < 1
  )
    throw new Error("The recording format could not be read.");
  const seconds = audio.length / audio.sampleRate;
  if (seconds < 0.1 || seconds > REPLY_AUDIO_MAX_SECONDS)
    throw new Error("Record between one and forty seconds, then try again.");
  const count = Math.floor(seconds * REPLY_AUDIO_RATE);
  const data = new ArrayBuffer(44 + count * 2);
  const view = new DataView(data);
  const tag = (offset: number, text: string) =>
    [...text].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  tag(0, "RIFF");
  view.setUint32(4, data.byteLength - 8, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, REPLY_AUDIO_RATE, true);
  view.setUint32(28, REPLY_AUDIO_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, count * 2, true);
  const channels = Array.from({ length: Math.min(audio.numberOfChannels, 2) }, (_, i) =>
    audio.getChannelData(i),
  );
  for (let i = 0; i < count; i++) {
    const position = (i * audio.sampleRate) / REPLY_AUDIO_RATE;
    const left = Math.floor(position),
      weight = position - left;
    const sample =
      channels.reduce(
        (sum, channel) =>
          sum +
          (channel[left] ?? 0) * (1 - weight) +
          (channel[Math.min(left + 1, channel.length - 1)] ?? 0) * weight,
        0,
      ) / channels.length;
    view.setInt16(
      44 + i * 2,
      Math.round(Math.max(-1, Math.min(1, Number.isFinite(sample) ? sample : 0)) * 32767),
      true,
    );
  }
  return data;
}

export function validateReplyWav(bytes: Uint8Array): { seconds: number; audible: boolean } {
  if (
    bytes.byteLength < 3244 ||
    bytes.byteLength > REPLY_AUDIO_MAX_BYTES ||
    (bytes.byteLength - 44) % 2
  )
    throw new Error("Recording must be between 0.1 and 45 seconds.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number, text: string) =>
    [...text].every((char, i) => view.getUint8(offset + i) === char.charCodeAt(0));
  if (
    !tag(0, "RIFF") ||
    !tag(8, "WAVE") ||
    !tag(12, "fmt ") ||
    !tag(36, "data") ||
    view.getUint32(4, true) !== bytes.byteLength - 8 ||
    view.getUint32(16, true) !== 16 ||
    view.getUint16(20, true) !== 1 ||
    view.getUint16(22, true) !== 1 ||
    view.getUint32(24, true) !== REPLY_AUDIO_RATE ||
    view.getUint32(28, true) !== REPLY_AUDIO_RATE * 2 ||
    view.getUint16(32, true) !== 2 ||
    view.getUint16(34, true) !== 16 ||
    view.getUint32(40, true) !== bytes.byteLength - 44
  )
    throw new Error("Unsupported recording format.");
  let audible = false;
  for (let i = 44; i < bytes.byteLength; i += 2)
    if (Math.abs(view.getInt16(i, true)) > 8) {
      audible = true;
      break;
    }
  return { seconds: (bytes.byteLength - 44) / (REPLY_AUDIO_RATE * 2), audible };
}
