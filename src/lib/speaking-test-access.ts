/** Temporary guest access is limited to the owner's isolated speaking test host. */
export const SPEAKING_TEST_HOST = "language-threshold-speaking-test.vercel.app";
export const SPEAKING_TEST_ACTOR_PREFIX = "speaking-test:";
export function isSpeakingTestHost(host: string) {
  return host === SPEAKING_TEST_HOST;
}
export function speakingTestPrincipal(request: Request): { userId: string } | null {
  const url = new URL(request.url);
  if (!isSpeakingTestHost(url.hostname) || url.protocol !== "https:") return null;
  if (!["/api/speak", "/api/speaking-transcribe", "/api/mission-tts"].includes(url.pathname))
    return null;
  if (request.headers.get("origin") !== url.origin) return null;
  if (request.headers.get("x-speaking-test-adult") !== "true") return null;
  const id = request.headers.get("x-speaking-test-session");
  if (!id || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))
    return null;
  return { userId: SPEAKING_TEST_ACTOR_PREFIX + id };
}
export function isSpeakingTestActor(actor: string) {
  return actor.startsWith(SPEAKING_TEST_ACTOR_PREFIX);
}
