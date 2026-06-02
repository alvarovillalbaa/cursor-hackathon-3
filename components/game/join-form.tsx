"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { joinGame } from "@/lib/client/api";
import { saveSession } from "@/lib/client/session";

const CODE_LENGTH = 5;

export function JoinForm({ code: fixedCode }: { code?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(fixedCode?.toUpperCase() ?? "");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const codeLocked = Boolean(fixedCode);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const finalCode = code.trim().toUpperCase();
    if (finalCode.length !== CODE_LENGTH) {
      toast.error("Enter the full game code");
      return;
    }
    if (!trimmedName) {
      toast.error("Enter your name first");
      return;
    }
    setLoading(true);
    try {
      const res = await joinGame(finalCode, trimmedName);
      saveSession({
        code: res.code,
        playerId: res.player.id,
        name: res.player.name,
        isHost: false,
      });
      router.push(`/play/${res.code}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not join game");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!codeLocked && (
        <div className="flex flex-col items-center gap-2">
          <Label>Game code</Label>
          <InputOTP
            maxLength={CODE_LENGTH}
            value={code}
            onChange={(v) => setCode(v.toUpperCase())}
            inputMode="text"
            pattern="[A-Za-z0-9]*"
          >
            <InputOTPGroup>
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="player-name">Your name</Label>
        <Input
          id="player-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sam"
          maxLength={24}
          autoComplete="off"
          autoFocus={codeLocked}
        />
      </div>

      <Button type="submit" size="lg" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <ArrowRight />}
        Join game
      </Button>
    </form>
  );
}
