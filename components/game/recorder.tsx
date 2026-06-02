"use client";

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  CircleDot,
  Loader2,
  RotateCcw,
  Send,
  ShieldAlert,
  Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PoseImage } from "@/components/game/pose-image";
import { useRecorder } from "@/hooks/use-recorder";
import type { PoseRef } from "@/lib/types";

export function Recorder({
  pose,
  recordSeconds,
  submitting,
  onSubmit,
}: {
  pose: PoseRef;
  recordSeconds: number;
  submitting: boolean;
  onSubmit: (video: Blob) => void;
}) {
  const {
    status,
    stream,
    videoBlob,
    previewUrl,
    error,
    elapsedMs,
    maxMs,
    requestCamera,
    start,
    stop,
    reset,
  } = useRecorder({ maxMs: recordSeconds * 1000 });

  const liveRef = useRef<HTMLVideoElement>(null);
  const [secureContext, setSecureContext] = useState(true);

  useEffect(() => {
    setSecureContext(window.isSecureContext);
  }, []);

  // Attach the live camera stream to the preview element.
  useEffect(() => {
    const el = liveRef.current;
    if (el && stream) {
      el.srcObject = stream;
    }
  }, [stream, status]);

  const recordProgress = Math.min(100, (elapsedMs / maxMs) * 100);
  const remaining = Math.max(0, Math.ceil((maxMs - elapsedMs) / 1000));

  // ---- Unsupported / permission-denied states ----
  if (status === "unsupported" || status === "denied" || status === "error") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold">
            {status === "unsupported"
              ? "Camera not supported"
              : status === "denied"
                ? "Camera permission needed"
                : "Camera error"}
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            {status === "denied"
              ? "Allow camera access in your browser, then try again."
              : error ?? "We couldn't start the camera on this device."}
          </p>
          {!secureContext && (
            <p className="max-w-xs text-sm text-destructive">
              The camera only works over HTTPS. Open the game using the secure
              link from the host screen.
            </p>
          )}
        </div>
        <Button onClick={requestCamera} variant="outline">
          <Camera /> Try again
        </Button>
      </div>
    );
  }

  // ---- Idle: ask for camera ----
  if (status === "idle" || status === "requesting") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="w-40 overflow-hidden rounded-2xl ring-1 ring-foreground/10">
          <PoseImage pose={pose} className="aspect-square w-full" />
        </div>
        <div className="space-y-1">
          <h3 className="font-heading text-lg font-semibold">
            Strike the {pose.name} pose
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Enable your camera and record yourself holding the pose.
          </p>
        </div>
        <Button
          size="lg"
          onClick={requestCamera}
          disabled={status === "requesting"}
        >
          {status === "requesting" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Camera />
          )}
          Enable camera
        </Button>
      </div>
    );
  }

  // ---- Recorded: review + submit ----
  if (status === "recorded" && previewUrl) {
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-black ring-1 ring-foreground/10">
          <video
            src={previewUrl}
            controls
            playsInline
            className="aspect-square w-full object-cover"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Happy with your {pose.name}? Submit it for scoring.
        </p>
        <div className="flex w-full max-w-sm gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={reset}
            disabled={submitting}
          >
            <RotateCcw /> Re-record
          </Button>
          <Button
            className="flex-1"
            onClick={() => videoBlob && onSubmit(videoBlob)}
            disabled={submitting || !videoBlob}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <Send />}
            Submit
          </Button>
        </div>
      </div>
    );
  }

  // ---- Ready / recording: live preview ----
  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-black ring-1 ring-foreground/10">
        <video
          ref={liveRef}
          autoPlay
          muted
          playsInline
          className="aspect-square w-full -scale-x-100 object-cover"
        />
        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white">
          <PoseImage pose={pose} className="size-4" />
          {pose.name}
        </div>
        {status === "recording" && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
            <CircleDot className="size-3 animate-pulse" />
            {remaining}s
          </div>
        )}
      </div>

      {status === "recording" ? (
        <>
          <Progress value={recordProgress} className="w-full max-w-sm" />
          <Button
            size="lg"
            variant="destructive"
            className="w-full max-w-sm"
            onClick={stop}
          >
            <Square /> Stop recording
          </Button>
        </>
      ) : (
        <Button size="lg" className="w-full max-w-sm" onClick={start}>
          <CircleDot /> Start recording ({recordSeconds}s)
        </Button>
      )}
    </div>
  );
}
