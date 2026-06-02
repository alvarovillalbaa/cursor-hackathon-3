"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { TriangleAlert } from "lucide-react";

export function QrPanel({ code }: { code: string }) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    const base =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      window.location.origin;
    setJoinUrl(`${base}/join/${code}`);
    setIsLocalhost(/^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(base));
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

      {joinUrl && (
        <p className="max-w-64 truncate text-center font-mono text-xs text-muted-foreground">
          {joinUrl.replace(/^https?:\/\//, "")}
        </p>
      )}

      {isLocalhost ? (
        <p className="flex max-w-64 items-start gap-1.5 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Phones can&apos;t reach <code>localhost</code>. Open this app on the
            host via your computer&apos;s network IP or an HTTPS tunnel (set{" "}
            <code>NEXT_PUBLIC_APP_URL</code>) so the QR and camera work.
          </span>
        </p>
      ) : (
        <p className="max-w-52 text-center text-xs text-muted-foreground">
          Scan to join on your phone, or enter the code manually.
        </p>
      )}
    </div>
  );
}
