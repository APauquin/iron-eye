import { getPoseLandmarker, reserveTimeline, resetPoseLandmarker } from "./pose.ts";
import type { ClipCapture } from "../types.ts";

const SAMPLE_RATE = 30; // frames analysed per second of clip
const MAX_FRAME_WIDTH = 720;
const JPEG_QUALITY = 0.78;

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => resolve({ video, url });
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read this video. Try an MP4 or MOV file."));
    };
    video.src = url;
    video.load();
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    video.onseeked = () => resolve();
    video.currentTime = time;
  });
}

/**
 * Track the lifter on every frame of the [start, end] window (30 per second),
 * and keep `keyFrameCount` evenly spaced JPEG frames for display and the AI coach.
 */
export async function captureClip(
  file: File,
  start: number,
  end: number,
  keyFrameCount: number,
  onProgress: (done: number, total: number) => void,
): Promise<ClipCapture> {
  const landmarker = await getPoseLandmarker();
  const { video, url } = await loadVideo(file);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser can't read video frames.");
  const width = Math.min(video.videoWidth, MAX_FRAME_WIDTH);
  canvas.width = width;
  canvas.height = Math.round((width * video.videoHeight) / video.videoWidth);

  const from = Math.max(0, start);
  const to = Math.min(end, video.duration - 0.001);
  const total = Math.max(2, Math.floor((to - from) * SAMPLE_RATE) + 1);
  const keyIndices = new Set(Array.from({ length: keyFrameCount }, (_, i) => Math.round((i * (total - 1)) / (keyFrameCount - 1))));

  const capture: ClipCapture = { timestamps: [], poses: [], width: canvas.width, height: canvas.height, keyFrames: [], keyPoses: [] };
  const timelineStart = reserveTimeline(((total - 1) / SAMPLE_RATE) * 1000);
  try {
    for (let i = 0; i < total; i++) {
      const time = from + i / SAMPLE_RATE;
      await seek(video, time);
      const modelTimestamp = timelineStart + Math.round((i * 1000) / SAMPLE_RATE);
      const landmarks = landmarker.detectForVideo(video, modelTimestamp).landmarks[0] ?? null;

      capture.timestamps.push(Number(time.toFixed(4)));
      capture.poses.push(landmarks ? landmarks.map((p) => [p.x, p.y, p.visibility ?? 0]) : null);

      if (keyIndices.has(i)) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        capture.keyFrames.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1]);
        capture.keyPoses.push(landmarks);
      }
      onProgress(i + 1, total);
    }
  } catch (err) {
    resetPoseLandmarker();
    const detail = err instanceof Error ? err.message.split("\n")[0].slice(0, 120) : "unknown error";
    throw new Error(`Pose tracking failed. Please try again. (${detail})`, { cause: err });
  } finally {
    URL.revokeObjectURL(url);
  }
  return capture;
}
