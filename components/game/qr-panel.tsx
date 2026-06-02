"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function QrPanel({ code }: { code: string }) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin;
    setJoinUrl(`${base}/join/${code}`);
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-foreground/10">
        {joinUrl ? (
          <QRCodeSVG
            value={joinUrl}
            size={208}
            level="M"
            marginSize={0}
            className="h-52 w-52"
          />
        ) : (
          <div className="h-52 w-52 animate-pulse rounded-xl bg-muted" />
        )}
      </div>
      <p className="max-w-52 text-center text-xs text-muted-foreground">
        Scan to join on your phone, or enter the code manually.
      </p>
    </div>
  );
}
