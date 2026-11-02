import { X } from "lucide-react";
import { useOverlayHistory } from "@/hooks/use-overlay-history";
import { useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";

/** Setup owns focus until a visible choice completes it; the app beneath stays inaccessible. */
export function LearningEntryModal({
  title,
  description,
  className,
  children,
  onDismiss,
}: {
  title: string;
  description: string;
  className: string;
  children: ReactNode;
  onDismiss: () => void;
}) {
  useOverlayHistory(true, onDismiss);
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open modal>
      <Dialog.Portal>
        <Dialog.Content
          aria-modal="true"
          className={className}
          onOpenAutoFocus={() => {
            returnFocus.current =
              document.activeElement instanceof HTMLElement ? document.activeElement : null;
          }}
          onCloseAutoFocus={(event) => {
            // These screens open through app state rather than a Radix Trigger.
            // Restore the actual launching control if it still belongs to the current page.
            if (returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onDismiss();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          <div className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50">
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Close setup"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
