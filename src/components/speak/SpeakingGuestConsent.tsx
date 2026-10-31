import { useEffect, useState } from "react";
import { useAuth } from "@/state/auth-state";
import { isSpeakingTestHost } from "@/lib/speaking-test-access";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function SpeakingGuestConsent() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (user || !isSpeakingTestHost(window.location?.hostname ?? "")) return;
    try {
      setOpen(sessionStorage.getItem("lt.speaking-test.adult") !== "true");
    } catch {
      setOpen(true);
    }
  }, [user]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Try speaking without signing in</DialogTitle>
          <DialogDescription>
            This test uses AI services to process your replies. By starting, you confirm you are 18
            or older. Test conversations are not saved to an account.
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          className="min-h-11 rounded-xl bg-primary px-4 text-primary-foreground"
          onClick={() => {
            try {
              sessionStorage.setItem("lt.speaking-test.adult", "true");
            } catch {
              /* Current page can still start. */
            }
            window.dispatchEvent(new Event("lt-speaking-test-ready"));
            setOpen(false);
          }}
        >
          Start speaking test — I’m 18 or older
        </button>
      </DialogContent>
    </Dialog>
  );
}
