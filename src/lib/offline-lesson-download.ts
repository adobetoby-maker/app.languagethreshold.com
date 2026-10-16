export type LessonDownloadCommand =
  "LESSON_PACK_STATUS" | "LESSON_PACK_INSTALL" | "LESSON_PACK_REMOVE";
export interface LessonDownloadStatus {
  ready: boolean;
  version: string | null;
  bytes: number;
}

/** No keys, account IDs, responses or arbitrary URLs cross this channel. */
export async function offlineLessonDownload(
  command: LessonDownloadCommand,
): Promise<LessonDownloadStatus> {
  if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller)
    throw new Error("Reload this page online once to prepare downloads on this browser.");
  const controller = navigator.serviceWorker.controller;
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(
      () => {
        channel.port1.close();
        reject(new Error("The download check timed out. Check saved status before trying again."));
      },
      command === "LESSON_PACK_INSTALL" ? 240000 : 15000,
    );
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      channel.port1.close();
      const result = event.data;
      if (result?.ok !== true) reject(new Error(result?.error || "Download could not finish."));
      else
        resolve({
          ready: result.ready === true,
          version: typeof result.version === "string" ? result.version : null,
          bytes: Number.isFinite(result.bytes) ? result.bytes : 0,
        });
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
