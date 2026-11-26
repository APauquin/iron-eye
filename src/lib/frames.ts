const MAX_FRAME_WIDTH = 720;
const JPEG_QUALITY = 0.78;

/**
 * Sample `count` evenly spaced JPEG frames (base64, no data: prefix)
 * from the [start, end] window of a video file.
 */
export function extractFrames(file: File, count: number, start: number, end: number): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const frames: string[] = [];

    if (!ctx) {
      reject(new Error("Your browser can't read video frames."));
      return;
    }

    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read this video. Try an MP4 or MOV file."));
    };

    video.muted = true;
    video.playsInline = true;
    video.onerror = fail;

    video.onloadedmetadata = () => {
      const width = Math.min(video.videoWidth, MAX_FRAME_WIDTH);
      canvas.width = width;
      canvas.height = Math.round((width * video.videoHeight) / video.videoWidth);

      const from = Math.max(0, start);
      const to = Math.min(end, video.duration);
      const span = to - from;
      const times = Array.from({ length: count }, (_, i) => from + (i / (count - 1)) * span * 0.999);

      let index = 0;
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", JPEG_QUALITY).split(",")[1]);
        index += 1;
        if (index < times.length) {
          video.currentTime = times[index];
        } else {
          URL.revokeObjectURL(url);
          resolve(frames);
        }
      };
      video.currentTime = times[0];
    };

    video.src = url;
    video.load();
  });
}
