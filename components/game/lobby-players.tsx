import { Crown } from "lucide-react";

import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import type { PublicPlayer } from "@/lib/types";

export function LobbyPlayers({
  players,
  youId,
}: {
  players: PublicPlayer[];
  youId?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {players.map((player) => (
        <div
          key={player.id}
          className={cn(
            "flex items-center gap-2 rounded-2xl bg-card px-3 py-2 ring-1 ring-foreground/10 transition-all",
            player.id === youId && "ring-2 ring-primary"
          )}
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
              avatarColor(player.id)
            )}
          >
            {initials(player.name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {player.name}
            {player.id === youId && (
              <span className="text-muted-foreground"> (you)</span>
            )}
          </span>
          {player.isHost && (
            <Badge variant="secondary" className="gap-1">
              <Crown />
              Host
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
