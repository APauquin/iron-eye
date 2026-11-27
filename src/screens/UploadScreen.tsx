import { useRef, useState } from "react";
import type { DragEvent } from "react";
import GuidelineList from "../components/GuidelineList.tsx";
import HeightInput from "../components/HeightInput.tsx";
import Modal from "../components/Modal.tsx";
import Shell from "../components/Shell.tsx";
import TopBar from "../components/TopBar.tsx";
import VideoTrimmer from "../components/VideoTrimmer.tsx";
import { FILMING_TIPS, MAX_CLIP_SECONDS, MAX_UPLOAD_MB, MIN_CLIP_SECONDS } from "../config/lifts.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";
import type { Lift, TrimWindow, VideoFile } from "../types.ts";

interface UploadScreenProps {
  lift: Lift;
  video: VideoFile | null;
  trim: TrimWindow;
  heightCm: number | null;
  error: string | null;
  onFileChange: (file: File | null) => void;
  onTrimChange: (trim: TrimWindow) => void;
  onHeightChange: (value: number | null) => void;
  onError: (message: string | null) => void;
  onAnalyse: () => void;
  onBack: () => void;
}

export default function UploadScreen({
  lift,
  video,
  trim,
  heightCm,
  error,
  onFileChange,
  onTrimChange,
  onHeightChange,
  onError,
  onAnalyse,
  onBack,
}: UploadScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const clipLength = trim.end - trim.start;
  const canAnalyse = video !== null && clipLength >= MIN_CLIP_SECONDS;

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = (candidate: File | undefined) => {
    if (!candidate?.type.startsWith("video/")) {
      onError("Please upload a video file (MP4, MOV, AVI…)");
      return;
    }
    if (candidate.size > MAX_UPLOAD_MB * 1024 * 1024) {
      onError(`Video must be under ${MAX_UPLOAD_MB} MB.`);
      return;
    }
    onError(null);
    setPendingFile(candidate);
  };

  const confirmPendingFile = () => {
    onFileChange(pendingFile);
    setPendingFile(null);
  };

  const cancelPendingFile = () => {
    setPendingFile(null);
    clearInput();
  };

  const changeVideo = () => {
    onFileChange(null);
    clearInput();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.remove("over");
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <>
      <Shell accent={lift.colour}>
        <TopBar lift={lift} onBack={onBack} />

        <div style={{ padding: "24px 18px 14px" }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 38, lineHeight: 0.95 }}>{video ? "TRIM YOUR CLIP" : "UPLOAD VIDEO"}</h2>
          <p style={{ color: COLOURS.muted, fontSize: 12, marginTop: 6 }}>
            {video ? `Select up to ${MAX_CLIP_SECONDS} seconds — focus on a single rep` : lift.tip}
          </p>
        </div>

        <div style={{ padding: "0 18px", flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
          {video ? (
            <>
              <VideoTrimmer src={video.url} colour={lift.colour} onChange={onTrimChange} />
              <InfoBox lift={lift} />
              <HeightInput value={heightCm} colour={lift.colour} onChange={onHeightChange} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px", fontSize: 12, color: "#666" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>
                  <i className="ti ti-file-check" style={{ marginRight: 6, color: lift.colour }} aria-hidden="true" />
                  {video.file.name}
                </span>
                <button
                  onClick={changeVideo}
                  style={{ background: "none", border: "none", color: lift.colour, cursor: "pointer", fontSize: 12, fontWeight: 600, letterSpacing: "0.05em", padding: "4px 6px" }}
                >
                  CHANGE VIDEO
                </button>
              </div>
            </>
          ) : (
            <>
              <div
                className="dropzone"
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("over");
                }}
                onDragLeave={(e) => e.currentTarget.classList.remove("over")}
                onDrop={handleDrop}
                style={{
                  border: "2px dashed #222",
                  borderRadius: 16,
                  background: COLOURS.surface,
                  minHeight: 170,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ textAlign: "center", padding: 20 }}>
                  <i className="ti ti-video" style={{ fontSize: 36, color: "#333", display: "block", marginBottom: 10 }} aria-hidden="true" />
                  <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: COLOURS.text }}>TAP TO UPLOAD</div>
                  <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>or drag &amp; drop · MP4 MOV AVI</div>
                </div>
              </div>

              <div style={{ background: `${lift.colour}10`, borderRadius: 12, padding: "13px 15px", border: `1px solid ${lift.colour}25` }}>
                <CardHeading colour={lift.colour}>Required video format</CardHeading>
                <GuidelineList lift={lift} />
              </div>

              <div style={{ background: COLOURS.surface, borderRadius: 12, padding: "13px 15px", border: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 5 }}>
                <CardHeading colour={lift.colour}>Tips for best results</CardHeading>
                {FILMING_TIPS.map(([icon, tip]) => (
                  <div key={tip} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <i className={`ti ${icon}`} style={{ fontSize: 13, color: "#444", flexShrink: 0 }} aria-hidden="true" />
                    <span style={{ fontSize: 12, color: COLOURS.muted }}>{tip}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <input ref={inputRef} type="file" accept="video/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />

          {error && (
            <div
              role="alert"
              style={{
                background: "#FF3B3015",
                border: "1px solid #FF3B3030",
                borderRadius: 12,
                padding: "11px 14px",
                fontSize: 13,
                color: COLOURS.badText,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <i className="ti ti-alert-triangle" style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            className="btn-main"
            onClick={onAnalyse}
            disabled={!canAnalyse}
            style={{
              background: canAnalyse ? lift.colour : "#1a1a1a",
              color: canAnalyse ? "#fff" : "#333",
              border: "none",
              borderRadius: 14,
              padding: 17,
              fontFamily: FONT_DISPLAY,
              fontSize: 21,
              letterSpacing: "0.08em",
              cursor: canAnalyse ? "pointer" : "not-allowed",
              marginTop: "auto",
            }}
          >
            {video ? `ANALYSE ${clipLength > 0 ? `${clipLength.toFixed(1)}s ` : ""}CLIP →` : "ANALYSE LIFT →"}
          </button>
        </div>
        <div style={{ height: 18 }} />
      </Shell>

      {pendingFile && (
        <Modal
          lift={lift}
          title="Confirm format"
          primaryLabel="Use this video"
          secondaryLabel="Choose another"
          onPrimary={confirmPendingFile}
          onSecondary={cancelPendingFile}
        >
          <p style={{ fontSize: 13, color: "#777", lineHeight: 1.55, marginBottom: 10 }}>
            Confirm that this video follows the required format for {lift.name}. You'll be able to trim it down to {MAX_CLIP_SECONDS} seconds on the next
            screen.
          </p>
          <div style={{ fontSize: 12, color: lift.colour, marginBottom: 12, wordBreak: "break-word" }}>
            Selected: {pendingFile.name} · {(pendingFile.size / 1024 / 1024).toFixed(1)} MB
          </div>
          <GuidelineList lift={lift} />
        </Modal>
      )}
    </>
  );
}

function CardHeading({ colour, children }: { colour: string; children: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", color: colour, marginBottom: 8, textTransform: "uppercase" }}>{children}</div>
  );
}

function InfoBox({ lift }: { lift: Lift }) {
  return (
    <div
      style={{
        background: `${lift.colour}10`,
        border: `1px solid ${lift.colour}25`,
        borderRadius: 10,
        padding: "10px 12px",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
      }}
    >
      <i className="ti ti-info-circle" style={{ fontSize: 16, color: lift.colour, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: lift.colour, textTransform: "uppercase", marginBottom: 3 }}>What to clip</div>
        <div style={{ fontSize: 12, color: "#B8B8B8", lineHeight: 1.5 }}>{lift.trimHint}</div>
      </div>
    </div>
  );
}
