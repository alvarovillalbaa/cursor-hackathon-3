import { Medal, Trophy } from "lucide-react";

import { cn } from "@/lib/utils";
import { avatarColor, initials } from "@/lib/avatar";
import { Badge } from "@/components/ui/badge";
import type { RankingEntry } from "@/lib/types";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return <Trophy className="size-5 text-amber-500" aria-label="1st" />;
  if (rank === 2)
    return <Medal className="size-5 text-zinc-400" aria-label="2nd" />;
  if (rank === 3)
    return <Medal className="size-5 text-orange-700" aria-label="3rd" />;
  return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
}

export function Ranking({
  ranking,
  youId,
  showRoundScore = true,
}: {
  ranking: RankingEntry[];
  youId?: string;
  showRoundScore?: boolean;
}) {
  return (
    <ol className="flex w-full flex-col gap-2">
      {ranking.map((entry) => (
        <li
          key={entry.playerId}
          className={cn(
            "flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5 ring-1 ring-foreground/10",
            entry.playerId === youId && "ring-2 ring-primary",
            entry.rank === 1 && "bg-amber-50 dark:bg-amber-950/30"
          )}
        >
          <span className="flex w-6 justify-center">
            <RankBadge rank={entry.rank} />
          </span>
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
              avatarColor(entry.playerId)
            )}
          >
            {initials(entry.name)}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {entry.name}
            {entry.playerId === youId && (
              <span className="text-muted-foreground"> (you)</span>
            )}
          </span>
          {showRoundScore && entry.roundScore !== null && (
            <Badge variant="secondary" className="tabular-nums">
              +{entry.roundScore}
            </Badge>
          )}
          <span className="w-10 text-right text-base font-bold tabular-nums">
            {entry.total}
          </span>
        </li>
      ))}
    </ol>
  );
}
