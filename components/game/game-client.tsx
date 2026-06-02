"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brand } from "@/components/game/brand";
import { PhaseView } from "@/components/game/phase-view";
import { useGameState } from "@/hooks/use-game-state";
import { getSession } from "@/lib/client/session";

interface Identity {
  playerId: string;
  isHost: boolean;
  hostToken?: string;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-violet-50 via-white to-white px-4 py-8 dark:from-zinc-950 dark:via-black dark:to-black">
      <div className="w-full max-w-md">
        <Brand />
        <Card>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-40 items-center justify-center">{children}</div>;
}

export function GameClient({ expectHost }: { expectHost: boolean }) {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = (params?.code ?? "").toString().toUpperCase();

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!code) return;
    const session = getSession(code);
    if (!session) {
      router.replace(expectHost ? "/" : `/join/${code}`);
      return;
    }
    // Keep host and player on their respective routes.
    if (expectHost && !session.isHost) {
      router.replace(`/play/${code}`);
      return;
    }
    if (!expectHost && session.isHost) {
      router.replace(`/host/${code}`);
      return;
    }
    setIdentity({
      playerId: session.playerId,
      isHost: session.isHost,
      hostToken: session.hostToken,
    });
    setReady(true);
  }, [code, expectHost, router]);

  const { state, error, loading, refresh } = useGameState(code, {
    enabled: ready,
  });

  if (!ready || (loading && !state)) {
    return (
      <Shell>
        <Centered>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </Centered>
      </Shell>
    );
  }

  if (error && !state) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <TriangleAlert className="size-8 text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refresh}>
              Retry
            </Button>
            <Button asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  if (!state || !identity) {
    return (
      <Shell>
        <Centered>
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </Centered>
      </Shell>
    );
  }

  return (
    <Shell>
      <PhaseView
        code={code}
        identity={identity}
        state={state}
        refresh={refresh}
      />
    </Shell>
  );
}
