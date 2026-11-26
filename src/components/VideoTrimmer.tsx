import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "../config/lifts.ts";
import { formatTime } from "../lib/format.ts";
import type { TrimWindow } from "../types.ts";

type Handle = "start" | "end";

interface VideoTrimmerProps {
  src: string;
  colour: string;
  onChange: (window: TrimWindow) => void;
}

function TrimHandle({ percent, colour, onPointerDown }: { percent: number; colour: string; onPointerDown: (e: ReactPointerEvent) => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        top: -6,
        bottom: -6,
        left: `${percent}%`,
        width: 18,
        transform: "translateX(-50%)",
        background: colour,
        borderRadius: 4,
        cursor: "ew-resize",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        touchAction: "none",
        boxShadow: "0 2px 6px #00000080",
      }}
    >
      <div style={{ width: 2, height: 18, background: "#000", borderRadius: 1 }} />
      <div style={{ width: 2, height: 18, background: "#000", borderRadius: 1 }} />
    </div>
  );
}

/** Video preview with a draggable window (MIN..MAX seconds) that loops during playback. */
export default function VideoTrimmer({ src, colour, onChange }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [now, setNow] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState<Handle | null>(null);

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const initialEnd = Math.min(video.duration, MAX_CLIP_SECONDS);
    setDuration(video.duration);
    setStart(0);
    setEnd(initialEnd);
    onChange({ start: 0, end: initialEnd, duration: video.duration });
    video.currentTime = 0;
  };

  // Loop inside the selected window
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setNow(video.currentTime);
    if (video.currentTime >= end) video.currentTime = start;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.pause();
      return;
    }
    if (video.currentTime < start || video.currentTime >= end) video.currentTime = start;
    void video.play();
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const track = trackRef.current;
      if (!track || !duration) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = ratio * duration;

      if (dragging === "start") {
        const next = Math.max(0, end - MAX_CLIP_SECONDS, Math.min(time, end - MIN_CLIP_SECONDS));
        setStart(next);
        if (videoRef.current) videoRef.current.currentTime = next;
        onChange({ start: next, end, duration });
      } else {
        const next = Math.min(duration, start + MAX_CLIP_SECONDS, Math.max(time, start + MIN_CLIP_SECONDS));
        setEnd(next);
        if (videoRef.current) videoRef.current.currentTime = next;
        onChange({ start, end: next, duration });
      }
    };
    const onUp = () => setDragging(null);

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, duration, start, end, onChange]);

  const startDrag = (handle: Handle) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
  };

  const toPercent = (t: number) => (duration > 0 ? (t / duration) * 100 : 0);
  const clipLength = end - start;
  const atMax = MAX_CLIP_SECONDS - clipLength < 0.05;
  const showPlayhead = now >= start && now <= end;
  const badgeColour = atMax ? "#F59E0B" : colour;

  return (
    <div style={{ background: "#111", borderRadius: 12, border: "1px solid #1a1a1a", overflow: "hidden" }}>
      <div style={{ position: "relative", background: "#000", aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          onClick={togglePlay}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
        {!playing && (
          <button
            onClick={togglePlay}
            aria-label="Play clip"
            style={{ position: "absolute", inset: 0, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: colour,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px #00000080",
              }}
            >
              <i className="ti ti-player-play-filled" style={{ color: "#fff", fontSize: 22, marginLeft: 3 }} aria-hidden="true" />
            </div>
          </button>
        )}
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 11, color: "#777", fontVariantNumeric: "tabular-nums" }}>
          <span>{formatTime(start)}</span>
          <span
            style={{
              color: badgeColour,
              background: `${badgeColour}18`,
              fontWeight: 700,
              letterSpacing: "0.05em",
              fontSize: 12,
              padding: "3px 9px",
              borderRadius: 4,
            }}
          >
            {clipLength.toFixed(1)}S CLIP{atMax ? " · MAX" : ""}
          </span>
          <span>{formatTime(end)}</span>
        </div>

        <div
          ref={trackRef}
          style={{ position: "relative", height: 36, background: "#0a0a0a", borderRadius: 6, marginBottom: 10, touchAction: "none", border: "1px solid #1a1a1a" }}
        >
          <div
            style={{
              position: "absolute",
              top: -1,
              bottom: -1,
              left: `${toPercent(start)}%`,
              right: `${100 - toPercent(end)}%`,
              background: `${colour}30`,
              borderTop: `2px solid ${colour}`,
              borderBottom: `2px solid ${colour}`,
            }}
          />
          {showPlayhead && (
            <div
              style={{
                position: "absolute",
                top: -3,
                bottom: -3,
                left: `${toPercent(now)}%`,
                width: 2,
                background: "#fff",
                transform: "translateX(-1px)",
                pointerEvents: "none",
                boxShadow: "0 0 4px #ffffff80",
              }}
            />
          )}
          <TrimHandle percent={toPercent(start)} colour={colour} onPointerDown={startDrag("start")} />
          <TrimHandle percent={toPercent(end)} colour={colour} onPointerDown={startDrag("end")} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#444", letterSpacing: "0.05em" }}>
          <span>Drag handles · {MAX_CLIP_SECONDS}s max</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>Total: {formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
