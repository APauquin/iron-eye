import { useState } from "react";
import { FRAME_COUNT, MAX_CLIP_SECONDS, MIN_CLIP_SECONDS } from "./config/lifts.ts";
import { analyseFrames, analyseMotion } from "./lib/api.ts";
import { captureClip } from "./lib/frames.ts";
import { getPoseLandmarker } from "./lib/pose.ts";
import { loadHeightCm, saveHeightCm } from "./lib/storage.ts";
import AnalysingScreen from "./screens/AnalysingScreen.tsx";
import ResultsScreen from "./screens/ResultsScreen.tsx";
import SelectScreen from "./screens/SelectScreen.tsx";
import UploadScreen from "./screens/UploadScreen.tsx";
import type { AnalysisResult, ClipCapture, Lift, MotionResult, Step, TrimWindow, VideoFile } from "./types.ts";

const EMPTY_TRIM: TrimWindow = { start: 0, end: 0, duration: 0 };

const messageOf = (reason: unknown) => (reason instanceof Error ? reason.message : "Something went wrong — please try again.");

/** Top-level flow: select lift → upload & trim → analyse → results. */
export default function IronEye() {
  const [step, setStep] = useState<Step>("select");
  const [lift, setLift] = useState<Lift | null>(null);
  const [video, setVideo] = useState<VideoFile | null>(null);
  const [trim, setTrim] = useState<TrimWindow>(EMPTY_TRIM);
  const [heightCm, setHeightCm] = useState<number | null>(loadHeightCm);
  const [capture, setCapture] = useState<ClipCapture | null>(null);
  const [motion, setMotion] = useState<MotionResult | null>(null);
  const [motionError, setMotionError] = useState<string | null>(null);
  const [coach, setCoach] = useState<AnalysisResult | null>(null);
  const [coachError, setCoachError] = useState<string | null>(null);
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

  const changeHeight = (value: number | null) => {
    setHeightCm(value);
    saveHeightCm(value);
  };

  const analyse = async () => {
    if (!video || !lift) return;
    const clipLength = trim.end - trim.start;
    if (clipLength < MIN_CLIP_SECONDS) return setError(`Clip must be at least ${MIN_CLIP_SECONDS}s long.`);
    if (clipLength > MAX_CLIP_SECONDS + 0.1) return setError(`Clip can't exceed ${MAX_CLIP_SECONDS}s.`);

    setError(null);
    setStep("analysing");
    try {
      setStatus("Loading the pose model…");
      const captured = await captureClip(video.file, trim.start, trim.end, FRAME_COUNT, (done, total) =>
        setStatus(`Tracking your lift · frame ${done} of ${total}`),
      );

      setStatus("Measuring bar speed & getting coach notes…");
      const [motionOutcome, coachOutcome] = await Promise.allSettled([
        analyseMotion(captured, lift.id, heightCm),
        analyseFrames(captured.keyFrames, lift.id),
      ]);

      if (motionOutcome.status === "rejected" && coachOutcome.status === "rejected") {
        throw motionOutcome.reason;
      }
      setCapture(captured);
      setMotion(motionOutcome.status === "fulfilled" ? motionOutcome.value : null);
      setMotionError(motionOutcome.status === "rejected" ? messageOf(motionOutcome.reason) : null);
      setCoach(coachOutcome.status === "fulfilled" ? coachOutcome.value : null);
      setCoachError(coachOutcome.status === "rejected" ? messageOf(coachOutcome.reason) : null);
      setStep("results");
    } catch (err) {
      setError(messageOf(err));
      setStep("upload");
    }
  };

  const analyseAnother = () => {
    changeFile(null);
    setCapture(null);
    setMotion(null);
    setMotionError(null);
    setCoach(null);
    setCoachError(null);
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

  if (step === "results" && capture) {
    return (
      <ResultsScreen
        lift={lift}
        capture={capture}
        motion={motion}
        motionError={motionError}
        coach={coach}
        coachError={coachError}
        onAnalyseAnother={analyseAnother}
        onChangeLift={reset}
      />
    );
  }

  return (
    <UploadScreen
      lift={lift}
      video={video}
      trim={trim}
      heightCm={heightCm}
      error={error}
      onFileChange={changeFile}
      onTrimChange={setTrim}
      onHeightChange={changeHeight}
      onError={setError}
      onAnalyse={analyse}
      onBack={reset}
    />
  );
}
