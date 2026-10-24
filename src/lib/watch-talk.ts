import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { WatchTranscript } from "./watch-talk-protocol";

interface WatchTalkPlugin {
  start(): Promise<{ paired: boolean; installed: boolean }>;
  setContext(context: {
    contextId: string;
    locale: string;
    title: string;
    ready: boolean;
    expiresAt: number;
  }): Promise<void>;
  stop(): Promise<void>;
  acknowledge(result: { requestId: string; state: string }): Promise<void>;
  addListener(
    name: "transcript",
    listener: (event: WatchTranscript) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    name: "failure",
    listener: (event: { message: string }) => void,
  ): Promise<PluginListenerHandle>;
}
export const WatchTalk = registerPlugin<WatchTalkPlugin>("WatchTalk");
export const watchTalkAvailable = () =>
  Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("WatchTalk");
