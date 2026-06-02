"use client";

import { Check, Loader2, ScanEye } from "lucide-react";

import { Progress } from "@/components/ui/progress";
import type { PoseRef, PublicPlayer, SubmissionState } from "@/lib/types";

export function ScoringWait({
  pose,
  players,
  submissions,
}: {
  pose: PoseRef;
  players: PublicPlayer[];
  submissions: SubmissionState[];
}) {
  const submittedCount = submissions.filter((s) => s.hasSubmitted).length;
  const total = players.length || 1;
  const progress = (submittedCount / total) * 100;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ScanEye className="size-9" />
        <Loader2 className="absolute size-20 animate-spin text-primary/30" />
      </div>

      <div className="space-y-1">
        <h2 className="font-heading text-xl font-semibold">
          Analyzing your {pose.name}
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          LibreYOLO is detecting your keypoints and the judge is scoring the
          pose. Hang tight for the results.
        </p>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Submissions</span>
          <span className="font-semibold tabular-nums">
            {submittedCount}/{total}
          </span>
        </div>
        <Progress value={progress} />
        <ul className="space-y-1.5 pt-1">
          {players.map((player) => {
            const submitted = submissions.find(
              (s) => s.playerId === player.id
            )?.hasSubmitted;
            return (
              <li
                key={player.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">{player.name}</span>
                {submitted ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <Check className="size-4" /> Submitted
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Recording
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
