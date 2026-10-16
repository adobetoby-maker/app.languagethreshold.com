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
  timeout: number,
): Promise<{
  ok?: boolean;
  protocol?: number;
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
      controller.postMessage({ type: command }, [channel.port2]);
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
): Promise<LessonDownloadStatus> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller)
    throw new Error("Reload this page online once to prepare downloads on this browser.");
  const controller = navigator.serviceWorker.controller;
  const ping = await send(controller, "LESSON_PACK_PING", 6000);
  if (ping.protocol !== 1 || controller !== navigator.serviceWorker.controller)
    throw new Error("The app is updating. Reload online, then check saved files.");
  const result = await send(
    controller,
    command,
    command === "LESSON_PACK_INSTALL" ? 240000 : 15000,
  );
  if (controller !== navigator.serviceWorker.controller)
    throw new Error("The app updated during the download check. Check saved files again.");
  return {
    ready: result.ready === true,
    version: typeof result.version === "string" ? result.version : null,
    bytes: Number.isFinite(result.bytes) ? result.bytes! : 0,
  };
}
