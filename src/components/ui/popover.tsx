import { useOverlayState } from "@/hooks/use-overlay-history";
import { X } from "lucide-react";
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive.Root>) => {
  const state = useOverlayState(props);
  return <PopoverPrimitive.Root {...props} {...state} />;
};

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { scrollBody?: boolean }
>(
  (
    { className, children, scrollBody = false, align = "center", sideOffset = 4, ...props },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)",
          className,
          scrollBody && "flex flex-col overflow-hidden",
        )}
        {...props}
      >
        <div
          data-overlay-close
          className={cn(
            "flex justify-end bg-popover py-1",
            scrollBody ? "shrink-0 border-b border-border pb-2" : "sticky top-0 z-30",
          )}
        >
          <PopoverPrimitive.Close
            type="button"
            aria-label="Close settings"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </PopoverPrimitive.Close>
        </div>
        {scrollBody ? (
          <div
            data-overlay-scroll-body
            className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pt-3"
          >
            {children}
          </div>
        ) : (
          children
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  ),
);
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
