"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Minus, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGame } from "@/lib/client/api";
import { saveSession } from "@/lib/client/session";
import { DEFAULT_CONFIG } from "@/lib/types";

function Stepper({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(clamp(value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          <Minus />
        </Button>
        <span className="w-16 text-center text-sm font-semibold tabular-nums">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={() => onChange(clamp(value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

export function CreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [rounds, setRounds] = useState(DEFAULT_CONFIG.totalRounds);
  const [previewSeconds, setPreviewSeconds] = useState(
    DEFAULT_CONFIG.previewSeconds
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Enter your name first");
      return;
    }
    setLoading(true);
    try {
      const res = await createGame(trimmed, {
        totalRounds: rounds,
        previewSeconds,
      });
      saveSession({
        code: res.code,
        playerId: res.player.id,
        name: res.player.name,
        isHost: true,
        hostToken: res.hostToken,
      });
      router.push(`/host/${res.code}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create game");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="host-name">Your name</Label>
        <Input
          id="host-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Alvaro"
          maxLength={24}
          autoComplete="off"
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-muted/40 p-4">
        <Stepper
          label="Rounds"
          value={rounds}
          min={1}
          max={20}
          onChange={setRounds}
        />
        <Stepper
          label="Pose preview"
          value={previewSeconds}
          min={3}
          max={60}
          suffix="s"
          onChange={setPreviewSeconds}
        />
      </div>

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
        Create game
      </Button>
    </form>
  );
}
