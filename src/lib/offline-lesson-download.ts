import { OFFLINE_LESSON_TRACKS, type OfflineLessonPackId } from "./offline-lesson-tracks.ts";
export type LessonDownloadCommand =
  "LESSON_PACK_STATUS" | "LESSON_PACK_INSTALL" | "LESSON_PACK_REMOVE";
export interface LessonDownloadStatus {
  ready: boolean;
  version: string | null;
  bytes: number;
}

function send(
  controller: ServiceWorker,
  command: LessonDownloadCommand | "LESSON_PACK_PING",
  packId: OfflineLessonPackId,
  timeout: number,
): Promise<{
  ok?: boolean;
  protocol?: number;
  packIds?: string[];
  packId?: string;
  ready?: boolean;
  version?: string;
  bytes?: number;
  error?: string;
}> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => {
      channel.port1.close();
      reject(
        new Error("The download worker did not respond. Reload online, then check saved files."),
      );
    }, timeout);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      channel.port1.close();
      const result = event.data;
      if (result?.ok !== true) reject(new Error(result?.error || "Download could not finish."));
      else resolve(result);
    };
    try {
      controller.postMessage({ type: command, packId }, [channel.port2]);
    } catch {
      window.clearTimeout(timer);
      channel.port1.close();
      reject(new Error("The download worker changed. Reload online and check saved files."));
    }
  });
}

/** Check protocol support before starting a long operation on a previous app worker. */
export async function offlineLessonDownload(
  command: LessonDownloadCommand,
  packId: OfflineLessonPackId = "roofing-es-en",
): Promise<LessonDownloadStatus> {
  if (!Object.hasOwn(OFFLINE_LESSON_TRACKS, packId))
    throw new Error("This lesson track has no downloadable pack yet.");
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller)
    throw new Error("Reload this page online once to prepare downloads on this browser.");
  const controller = navigator.serviceWorker.controller;
  const ping = await send(controller, "LESSON_PACK_PING", packId, 6000);
  if (
    ping.protocol !== 2 ||
    !ping.packIds?.includes(packId) ||
    controller !== navigator.serviceWorker.controller
  )
    throw new Error("The app is updating. Reload online, then check saved files.");
  const result = await send(
    controller,
    command,
    packId,
    command === "LESSON_PACK_INSTALL" ? 240000 : 15000,
  );
  if (result.packId !== packId)
    throw new Error("Saved files belong to a different lesson track. Reload and check again.");
  if (controller !== navigator.serviceWorker.controller)
    throw new Error("The app updated during the download check. Check saved files again.");
  return {
    ready: result.ready === true,
    version: typeof result.version === "string" ? result.version : null,
    bytes: Number.isFinite(result.bytes) ? result.bytes! : 0,
  };
}
