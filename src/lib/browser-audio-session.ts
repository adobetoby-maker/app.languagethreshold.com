/** Optional Audio Session API: explicitly hand recording back to spoken playback. */
let generation = 0;
let recording: number | null = null;
function setType(type: "playback" | "play-and-record") {
  try {
    const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
    if (session) session.type = type;
  } catch {
    /* Unsupported or restricted browsers retain their normal routing. */
  }
}
export function beginBrowserRecordingSession() {
  const owned = ++generation;
  recording = owned;
  setType("play-and-record");
  return () => {
    if (recording !== owned) return;
    recording = null;
    setType("playback");
  };
}
export function prepareBrowserPlayback() {
  if (recording !== null) return false;
  setType("playback");
  return true;
}
