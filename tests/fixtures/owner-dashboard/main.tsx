import { createRoot } from "react-dom/client";
import { OwnerAccounts } from "../../../src/components/owner/OwnerAccounts";
import { OwnerDiscounts } from "../../../src/components/owner/OwnerDiscounts";
import { fixtureAuth } from "./auth";
createRoot(document.getElementById("root")!).render(
  <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
    <h1 className="text-2xl font-semibold">Local synthetic owner dashboard QA</h1>
    <p>Fictional accounts only. No hosted account, email or billing writes.</p>
    <button onClick={() => fixtureAuth.signOut()}>Sign out synthetic owner</button>
    <OwnerAccounts />
    <OwnerDiscounts />
  </main>,
);
