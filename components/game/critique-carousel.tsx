"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquareQuote, Quote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { fetchCritique } from "@/lib/client/api";
import type { CritiqueQuote } from "@/lib/types";

function scoreTone(score: number): string {
  if (score >= 90) return "text-amber-600";
  if (score >= 70) return "text-emerald-600";
  if (score >= 45) return "text-blue-600";
  return "text-muted-foreground";
}

export function CritiqueCarousel({
  code,
  round,
  variant = "outline",
}: {
  code: string;
  round: number;
  variant?: "outline" | "secondary" | "ghost";
}) {
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState<CritiqueQuote[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchCritique(code, round);
      setQuotes(res.quotes);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not load critique"
      );
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next && !quotes && !loading) load();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <MessageSquareQuote /> Critique us
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>The judge&apos;s critique</DialogTitle>
          <DialogDescription>
            An educated word on each performance this round.
          </DialogDescription>
        </DialogHeader>

        {loading || !quotes ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : quotes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No submissions to critique yet.
          </p>
        ) : (
          <div className="px-10">
            <Carousel setApi={setApi} opts={{ loop: true }}>
              <CarouselContent>
                {quotes.map((q) => (
                  <CarouselItem key={q.playerId}>
                    <div className="flex min-h-48 flex-col gap-3 rounded-2xl bg-muted/40 p-5">
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-semibold">
                          {q.name}
                        </span>
                        <Badge variant="secondary" className="tabular-nums">
                          <span className={scoreTone(q.score)}>{q.score}</span>
                          /100
                        </Badge>
                      </div>
                      <Quote className="size-6 text-primary/40" />
                      <p className="text-sm leading-relaxed text-foreground">
                        {q.quote}
                      </p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
            <p className="pt-3 text-center text-xs text-muted-foreground tabular-nums">
              {current + 1} / {quotes.length}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
