"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Flag,
  Loader2,
  Play,
  PartyPopper,
  Eye,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  nextRound as apiNext,
  revealRound as apiReveal,
  startGame as apiStart,
  submitVideo,
} from "@/lib/client/api";
import type { GameState } from "@/lib/types";

import { CritiqueCarousel } from "@/components/game/critique-carousel";
import { LobbyPlayers } from "@/components/game/lobby-players";
import { PosePreview } from "@/components/game/pose-preview";
import { QrPanel } from "@/components/game/qr-panel";
import { Ranking } from "@/components/game/ranking";
import { Recorder } from "@/components/game/recorder";
import { ScoringWait } from "@/components/game/scoring-wait";

interface Identity {
  playerId: string;
  isHost: boolean;
  hostToken?: string;
}

function HostPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
        Host controls
      </span>
      {children}
    </div>
  );
}

function RoundHeader({
  state,
  submittedCount,
}: {
  state: GameState;
  submittedCount: number;
}) {
  return (
    <div className="mb-5 flex items-center justify-between gap-2">
      <Badge variant="secondary" className="font-mono">
        Round {state.currentRound}/{state.config.totalRounds}
      </Badge>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {submittedCount}/{state.players.length}
        </span>
        <span className="font-mono tracking-widest">{state.code}</span>
      </div>
    </div>
  );
}

export function PhaseView({
  code,
  identity,
  state,
  refresh,
}: {
  code: string;
  identity: Identity;
  state: GameState;
  refresh: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [localSubmitted, setLocalSubmitted] = useState(false);

  // Reset the optimistic "submitted" flag whenever a new round begins.
  useEffect(() => {
    setLocalSubmitted(false);
  }, [state.currentRound]);

  const youId = identity.playerId;
  const mySubmission = state.submissions.find((s) => s.playerId === youId);
  const hasSubmitted = Boolean(mySubmission?.hasSubmitted) || localSubmitted;
  const submittedCount = state.submissions.filter((s) => s.hasSubmitted).length;

  async function act(key: string, fn: () => Promise<unknown>) {
    setBusy(key);
    try {
      await fn();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function handleSubmit(video: Blob) {
    setSubmitting(true);
    try {
      await submitVideo(code, youId, state.currentRound, video);
      setLocalSubmitted(true);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Lobby ----
  if (state.status === "lobby") {
    if (identity.isHost) {
      return (
        <div className="flex flex-col items-center gap-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Game code</p>
            <p className="font-mono text-4xl font-bold tracking-[0.3em]">
              {code}
            </p>
          </div>
          <QrPanel code={code} />
          <div className="w-full">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-heading font-semibold">Players</h3>
              <Badge variant="secondary">{state.players.length}</Badge>
            </div>
            <LobbyPlayers players={state.players} youId={youId} />
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => act("start", () => apiStart(code, identity.hostToken ?? ""))}
            disabled={busy === "start"}
          >
            {busy === "start" ? <Loader2 className="animate-spin" /> : <Play />}
            Start now
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You&apos;re the host and you&apos;ll play too. Start when everyone
            has joined.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <h2 className="font-heading text-xl font-semibold">You&apos;re in!</h2>
          <p className="font-mono text-sm tracking-widest text-muted-foreground">
            {code}
          </p>
        </div>
        <LobbyPlayers players={state.players} youId={youId} />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Waiting for the host to start...
        </div>
      </div>
    );
  }

  // ---- Finished ----
  if (state.status === "finished") {
    const winner = state.ranking[0];
    return (
      <div className="flex flex-col items-center gap-5">
        <PartyPopper className="size-12 text-amber-500" />
        <div className="text-center">
          <h2 className="font-heading text-2xl font-bold">Final results</h2>
          {winner && (
            <p className="text-sm text-muted-foreground">
              <Trophy className="mr-1 inline size-4 text-amber-500" />
              {winner.name} takes the crown with {winner.total} points
            </p>
          )}
        </div>
        <Ranking ranking={state.ranking} youId={youId} showRoundScore={false} />
        <div className="flex flex-wrap items-center justify-center gap-2">
          <CritiqueCarousel code={code} round={state.config.totalRounds} />
          <Button onClick={() => router.push("/")}>
            <ArrowRight /> Play again
          </Button>
        </div>
      </div>
    );
  }

  // ---- In round ----
  if (!state.pose) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isResults = state.phase === "results";
  const isPreview = state.phase === "preview";

  return (
    <div className="w-full">
      <RoundHeader state={state} submittedCount={submittedCount} />

      {isPreview && state.phaseEndsAt && (
        <PosePreview
          pose={state.pose}
          phaseEndsAt={state.phaseEndsAt}
          serverNow={state.serverNow}
          previewSeconds={state.config.previewSeconds}
        />
      )}

      {(state.phase === "recording" || state.phase === "scoring") &&
        (hasSubmitted ? (
          <ScoringWait
            pose={state.pose}
            players={state.players}
            submissions={state.submissions}
          />
        ) : (
          <Recorder
            pose={state.pose}
            recordSeconds={state.config.recordSeconds}
            submitting={submitting}
            onSubmit={handleSubmit}
          />
        ))}

      {isResults && (
        <div className="flex flex-col items-center gap-4">
          <h2 className="font-heading text-xl font-semibold">
            Round {state.currentRound} results
          </h2>
          <Ranking ranking={state.ranking} youId={youId} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <CritiqueCarousel code={code} round={state.currentRound} />
            {!identity.isHost && (
              <span className="text-sm text-muted-foreground">
                Waiting for the host...
              </span>
            )}
          </div>
        </div>
      )}

      {/* Host controls */}
      {identity.isHost &&
        (state.phase === "recording" || state.phase === "scoring") && (
          <HostPanel>
            <p className="text-sm text-muted-foreground">
              {submittedCount}/{state.players.length} players have submitted.
            </p>
            <Button
              variant="outline"
              onClick={() => act("reveal", () => apiReveal(code, identity.hostToken ?? ""))}
              disabled={busy === "reveal"}
            >
              {busy === "reveal" ? <Loader2 className="animate-spin" /> : <Eye />}
              Reveal results now
            </Button>
          </HostPanel>
        )}

      {identity.isHost && isResults && (
        <HostPanel>
          <Button
            onClick={() => act("next", () => apiNext(code, identity.hostToken ?? ""))}
            disabled={busy === "next"}
          >
            {busy === "next" ? (
              <Loader2 className="animate-spin" />
            ) : state.currentRound >= state.config.totalRounds ? (
              <Flag />
            ) : (
              <ArrowRight />
            )}
            {state.currentRound >= state.config.totalRounds
              ? "Finish game"
              : "Next round"}
          </Button>
        </HostPanel>
      )}
    </div>
  );
}
