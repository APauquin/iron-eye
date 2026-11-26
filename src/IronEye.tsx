import { useState } from "react";
import { FRAME_COUNT, MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "./config/lifts.ts";
import { analyseFrames } from "./lib/api.ts";
import { extractFrames } from "./lib/frames.ts";
import { detectPose, getPoseLandmarker } from "./lib/pose.ts";
import AnalysingScreen from "./screens/AnalysingScreen.tsx";
import ResultsScreen from "./screens/ResultsScreen.tsx";
import SelectScreen from "./screens/SelectScreen.tsx";
import UploadScreen from "./screens/UploadScreen.tsx";
import type { AnalysisResult, Lift, Pose, Step, TrimWindow, VideoFile } from "./types.ts";

const EMPTY_TRIM: TrimWindow = { start: 0, end: 0, duration: 0 };

/** Top-level flow: select lift → upload & trim → analyse → results. */
export default function IronEye() {
  const [step, setStep] = useState<Step>("select");
  const [lift, setLift] = useState<Lift | null>(null);
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [trim, setTrim] = useState<TrimWindow>(EMPTY_TRIM);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [poses, setPoses] = useState<Pose[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectLift = (selected: Lift) => {
    if (!selected.available) return;
    setLift(selected);
    setStep("upload");
    getPoseLandmarker().catch(() => {}); // warm up the pose model while the user picks a video
  };

  const changeFile = (next: File | null) => {
    if (video) URL.revokeObjectURL(video.url);
    setVideo(next ? { file: next, url: URL.createObjectURL(next) } : null);
    setTrim(EMPTY_TRIM);
  };

  const analyse = async () => {
    if (!video || !lift) return;
    const clipLength = trim.end - trim.start;
    if (clipLength < MIN_CLIP_SECONDS) return setError(`Clip must be at least ${MIN_CLIP_SECONDS}s long.`);
    if (clipLength > MAX_CLIP_SECONDS + 0.1) return setError(`Clip can't exceed ${MAX_CLIP_SECONDS}s.`);

    setError(null);
    setStep("analysing");
    try {
      setStatus("Extracting frames from your clip…");
      const extracted = await extractFrames(video.file, FRAME_COUNT, trim.start, trim.end);

      setStatus("Detecting body positions & analysing form…");
      const [detected, analysis] = await Promise.all([Promise.all(extracted.map(detectPose)), analyseFrames(extracted, lift.id)]);

      setFrames(extracted);
      setPoses(detected);
      setResult(analysis);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed — please try again.");
      setStep("upload");
    }
  };

  const analyseAnother = () => {
    changeFile(null);
    setResult(null);
    setFrames([]);
    setPoses([]);
    setStep("upload");
  };

  const reset = () => {
    analyseAnother();
    setError(null);
    setLift(null);
    setStep("select");
  };

  if (!lift || step === "select") return <SelectScreen onSelect={selectLift} />;

  if (step === "analysing") return <AnalysingScreen lift={lift} status={status} />;

  if (step === "results" && result) {
    return <ResultsScreen lift={lift} result={result} frames={frames} poses={poses} onAnalyseAnother={analyseAnother} onChangeLift={reset} />;
  }

  return (
    <UploadScreen
      lift={lift}
      video={video}
      trim={trim}
      error={error}
      onFileChange={changeFile}
      onTrimChange={setTrim}
      onError={setError}
      onAnalyse={analyse}
      onBack={reset}
    />
  );
}
