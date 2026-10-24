import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MicrophoneTestDialog } from "../src/components/speak/MicrophoneTestDialog";
import "../src/styles.css";
export function Fixture() {
  const [epoch, setEpoch] = useState(0);
  return (
    <>
      <button onClick={() => setEpoch((x) => x + 1)}>Change practice account</button>
      <MicrophoneTestDialog key={epoch} />
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
