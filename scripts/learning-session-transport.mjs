import { runWithStartContext } from "@tanstack/start-storage-context";
// Match the installed application transport, including streaming Seroval frames.
import { serverFnFetcher } from "../node_modules/@tanstack/start-client-core/dist/esm/client-rpc/serverFnFetcher.js";
export function callLearningServerFn(url, options, handler = fetch) {
  // A standalone Node benchmark has no app request context. Only serialization
  // options are supplied locally; authentication is still enforced by the site.
  return runWithStartContext({ startOptions: {} }, () =>
    serverFnFetcher(url, [{ method: "POST", ...options }], handler),
  );
}
