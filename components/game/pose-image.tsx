import { cn } from "@/lib/utils";
import type { PoseRef } from "@/lib/types";

// Local, trusted SVG pose illustrations -- a plain <img> is the right tool here
// (no optimization benefit, and next/image blocks SVG by default).
export function PoseImage({
  pose,
  className,
}: {
  pose: PoseRef;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={pose.imageUrl}
      alt={`${pose.name} pose`}
      className={cn("select-none", className)}
      draggable={false}
    />
  );
}
