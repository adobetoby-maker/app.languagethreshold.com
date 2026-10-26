import type { CSSProperties, HTMLAttributes } from "react";
import { usePracticeViewport } from "@/hooks/use-practice-viewport";

/** Keep the working surface above phone navigation; long libraries remain outside. */
export function PhoneActivity({
  context,
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLElement> & { context: string }) {
  const viewport = usePracticeViewport(context);
  const height = viewport.style.height;
  return (
    <section
      {...props}
      ref={viewport.ref}
      className={`phone-activity ${className}`}
      style={
        {
          "--phone-activity-height": typeof height === "number" ? `${height}px` : height,
        } as CSSProperties
      }
    >
      {children}
    </section>
  );
}
