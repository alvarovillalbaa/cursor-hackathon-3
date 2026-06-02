"use client";

import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PoseImage } from "@/components/game/pose-image";
import type { PoseRef } from "@/lib/types";

const DIFFICULTY_VARIANT: Record<
  PoseRef["difficulty"],
  "secondary" | "default" | "destructive"
> = {
  beginner: "secondary",
  intermediate: "default",
  advanced: "destructive",
};

export function PosePreview({
  pose,
  phaseEndsAt,
  serverNow,
  previewSeconds,
}: {
  pose: PoseRef;
  phaseEndsAt: number;
  serverNow: number;
  previewSeconds: number;
}) {
  // Correct for client/server clock skew so every device counts down together.
  // Initialized to 0 (no skew) and measured once mounted to keep render pure.
  const skewRef = useRef(0);
  useEffect(() => {
    skewRef.current = serverNow - Date.now();
  }, [serverNow]);

  // Pure initial estimate from props; the effect below refines it with the
  // measured clock skew once mounted.
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, phaseEndsAt - serverNow)
  );

  useEffect(() => {
    const update = () =>
      setRemainingMs(Math.max(0, phaseEndsAt - (Date.now() + skewRef.current)));
    update();
    const id = setInterval(update, 150);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  const seconds = Math.ceil(remainingMs / 1000);
  const progress = Math.max(
    0,
    Math.min(100, (remainingMs / (previewSeconds * 1000)) * 100)
  );

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-muted-foreground">
          Memorize this pose
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums">{seconds}</span>
          <span className="text-muted-foreground">sec</span>
        </div>
      </div>

      <Progress value={progress} className="w-full max-w-sm" />

      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl ring-1 ring-foreground/10">
        <PoseImage pose={pose} className="aspect-square w-full" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-xl font-semibold">{pose.name}</h2>
          <Badge variant={DIFFICULTY_VARIANT[pose.difficulty]}>
            {pose.difficulty}
          </Badge>
        </div>
        {pose.sanskrit && (
          <p className="text-sm italic text-muted-foreground">
            {pose.sanskrit}
          </p>
        )}
      </div>

      <ul className="w-full max-w-sm space-y-1.5 text-sm text-muted-foreground">
        {pose.cues.map((cue, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-semibold text-primary">{i + 1}.</span>
            <span>{cue}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
