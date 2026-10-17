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
  onDismiss?: () => void;
}) {
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
            if (onDismiss && returnFocus.current?.isConnected) {
              event.preventDefault();
              returnFocus.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            event.preventDefault();
            onDismiss?.();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          <Dialog.Description className="sr-only">{description}</Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
