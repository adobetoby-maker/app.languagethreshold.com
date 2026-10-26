import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { SpeakingConsentDialog } from "../src/components/speak/SpeakingConsentDialog";
import "../src/styles.css";
export function Fixture() {
  const [open, setOpen] = useState(true),
    [accepted, setAccepted] = useState(0);
  return (
    <>
      <p>Consent UI test fixture · no account changes or recording</p>
      <p role="status">{accepted} confirmations</p>
      <button onClick={() => setOpen(true)}>Show startup notice</button>
      <SpeakingConsentDialog
        open={open}
        saving={false}
        unknown={false}
        language="Spanish"
        audioSource="selected"
        allowSkipWhileSaving
        onCheckSavedStatus={() => {}}
        onOpenChange={setOpen}
        onConfirm={() => {
          setAccepted((n) => n + 1);
          setOpen(false);
        }}
      />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
