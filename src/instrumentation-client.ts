// Sentry browser initialization for the client bundle.
import * as Sentry from "@sentry/react";
import "./lib/hmr-auto-refresh";

Sentry.init({
  dsn: "https://52ae18963621a4295b3922199712c010@o4511360538509312.ingest.us.sentry.io/4511363487694848",
  // Speaking transcripts render in the DOM, so session replay is deliberately
  // not installed. Error monitoring must not attach default user PII.
  integrations: [],
  tracesSampleRate: 0.1,
  sendDefaultPii: false,
});
