"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COPY } from "@/lib/copy";
import { Notice } from "./Notice";

type CameraCaptureProps = {
  side: "front" | "back";
  onCapture: (imageDataUrl: string, side: "front" | "back") => void;
  onCancel?: () => void;
  demoMode?: boolean;
};

export function CameraCapture({
  side,
  onCapture,
  onCancel,
  demoMode = false,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initCamera() {
      if (typeof navigator === "undefined" || !navigator.mediaDevices) {
        setCameraError("Camera not available on this device.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch {
        setCameraError(COPY.capture.permissionDenied);
      }
    }

    void initCamera();
    return () => {
      cancelled = true;
      stopStream();
    };
  }, [stopStream, side]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(dataUrl);
    stopStream();
  }, [stopStream]);

  const useMockCapture = useCallback(() => {
    const mockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
      <rect fill="#e8f5f0" width="640" height="400"/>
      <rect x="40" y="60" width="560" height="280" rx="12" fill="#fff" stroke="#1a5f4a" stroke-width="3"/>
      <text x="320" y="160" text-anchor="middle" font-family="system-ui" font-size="24" fill="#1a5f4a">DemoCare Silver</text>
      <text x="320" y="200" text-anchor="middle" font-family="system-ui" font-size="18" fill="#5c5c5c">Member: Evelyn Brooks</text>
      <text x="320" y="240" text-anchor="middle" font-family="system-ui" font-size="16" fill="#5c5c5c">ID: DEMO-77104 · ${side.toUpperCase()}</text>
      <text x="320" y="360" text-anchor="middle" font-family="system-ui" font-size="14" fill="#b45309">Synthetic demo image</text>
    </svg>`;
    const dataUrl = `data:image/svg+xml,${encodeURIComponent(mockSvg)}`;
    setPreview(dataUrl);
    stopStream();
  }, [side, stopStream]);

  const confirmCapture = () => {
    if (preview) onCapture(preview, side);
  };

  const retake = async () => {
    setPreview(null);
    setCameraError(null);
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch {
      setCameraError(
        "I couldn't access your camera. You can use a demo photo instead.",
      );
    }
  };

  const sideLabel = side === "front" ? "front" : "back";
  const copyBlock = side === "front" ? COPY.capture.front : COPY.capture.back;

  return (
    <section
      aria-labelledby="camera-capture-title"
      className="relay-card overflow-hidden"
    >
      <div className="p-5">
        <p className="text-xs font-semibold tracking-wide text-relay-olive uppercase">
          {cameraReady && !preview ? copyBlock.status : "LOCAL ONLY"}
        </p>
        <h2 id="camera-capture-title" className="mt-2 font-serif text-2xl text-relay-text">
          {copyBlock.heading}
        </h2>
        <p className="relay-support mt-2">{copyBlock.hint}</p>
        <p className="relay-support mt-1 text-sm">{COPY.capture.localOnly}</p>
      </div>

      <div
        className="relative aspect-[4/3] bg-relay-text"
        role="img"
        aria-label={`Camera preview for insurance card ${sideLabel}`}
      >
        {!preview ? (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
              aria-hidden="true"
            />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center bg-relay-text/80">
                <p className="text-white">Starting camera…</p>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-relay-accent p-6 text-center">
                <Notice variant="warning">{cameraError}</Notice>
              </div>
            )}
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={`Captured insurance card ${sideLabel}`}
            className="h-full w-full object-contain bg-black"
          />
        )}
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>

      <div className="flex flex-col gap-3 p-5">
        {!preview ? (
          <>
            {cameraReady && (
              <button
                type="button"
                onClick={takePhoto}
                className="min-h-[var(--relay-tap-min)] w-full rounded-xl bg-relay-primary px-6 text-lg font-semibold text-white hover:bg-relay-primary-hover focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
                aria-label={`Capture ${sideLabel} of insurance card`}
              >
                Capture
              </button>
            )}
            {(demoMode || cameraError) && (
              <button
                type="button"
                onClick={useMockCapture}
                className="min-h-[var(--relay-tap-min)] w-full rounded-xl border-2 border-relay-warning bg-white px-6 text-lg font-semibold text-relay-warning hover:bg-amber-50 focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
                aria-label={`Use demo photo for ${sideLabel} of insurance card`}
              >
                Use demo photo
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={confirmCapture}
              className="min-h-[var(--relay-tap-min)] w-full rounded-xl bg-relay-primary px-6 text-lg font-semibold text-white hover:bg-relay-primary-hover focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
            >
              Use this photo
            </button>
            <button
              type="button"
              onClick={retake}
              className="min-h-[var(--relay-tap-min)] w-full rounded-xl border-2 border-relay-border bg-relay-surface px-6 text-base font-semibold text-relay-text focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-active"
            >
              Retake
            </button>
          </>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[var(--relay-tap-min)] w-full rounded-xl border-2 border-relay-danger bg-white px-6 text-base font-semibold text-relay-danger focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-relay-danger"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}
