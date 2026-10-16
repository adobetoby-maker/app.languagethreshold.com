import type { ReactNode } from "react";
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
  return (
    <Dialog.Root open modal>
      <Dialog.Portal>
        <Dialog.Content
          className={className}
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
