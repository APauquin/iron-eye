import ScoreRing from "../components/ScoreRing.tsx";
import SectionLabel from "../components/SectionLabel.tsx";
import Shell from "../components/Shell.tsx";
import SkeletonOverlay from "../components/SkeletonOverlay.tsx";
import TopBar from "../components/TopBar.tsx";
import { BODY_PARTS, PRIORITY_STYLES } from "../config/lifts.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";
import type { AnalysisResult, BodyPart, Correction, Lift, Pose } from "../types.ts";

interface ResultsScreenProps {
  lift: Lift;
  result: AnalysisResult;
  frames: string[];
  poses: Pose[];
  onAnalyseAnother: () => void;
  onChangeLift: () => void;
}

const divider = <div style={{ width: "100%", height: 1, background: "#161616", marginBottom: 22 }} />;

export default function ResultsScreen({ lift, result, frames, poses, onAnalyseAnother, onChangeLift }: ResultsScreenProps) {
  const problemParts = new Set<BodyPart>(
    result.corrections.flatMap((c) => c.bodyParts).filter((part) => BODY_PARTS.includes(part)),
  );
  const corrections = [...result.corrections].sort((a, b) => PRIORITY_STYLES[a.priority].order - PRIORITY_STYLES[b.priority].order);

  return (
    <Shell accent={lift.colour}>
      <TopBar lift={lift} onBack={onAnalyseAnother} />

      <div className="scroll" style={{ flex: 1, padding: "20px 18px 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <p style={{ fontSize: 10, color: "#444", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 18 }}>Form score</p>
          <ScoreRing score={result.overallScore} colour={lift.colour} />
          <p style={{ fontSize: 14, color: "#777", lineHeight: 1.65, maxWidth: 330, margin: "0 auto" }}>{result.summary}</p>
        </div>

        {divider}

        {frames.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel colour={lift.colour} icon="ti-camera">
              Frame analysis
            </SectionLabel>
            <Legend />
            <FrameStrip frames={frames} poses={poses} problemParts={problemParts} />
            {problemParts.size > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                {[...problemParts].map((part) => (
                  <span
                    key={part}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: COLOURS.badText,
                      background: "#FF3B3018",
                      border: "1px solid #FF3B3030",
                      padding: "3px 8px",
                      borderRadius: 4,
                    }}
                  >
                    {part}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {divider}

        {result.strengths.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel colour={COLOURS.good} icon="ti-circle-check">
              Strengths
            </SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.strengths.map((strength) => (
                <div
                  key={strength}
                  style={{ background: "#22C55E0e", border: "1px solid #22C55E1a", borderRadius: 10, padding: "10px 13px", fontSize: 13, color: "#E0E0E0", lineHeight: 1.5 }}
                >
                  {strength}
                </div>
              ))}
            </div>
          </div>
        )}

        {corrections.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel colour={COLOURS.badText} icon="ti-alert-triangle">
              Fix these
            </SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {corrections.map((correction) => (
                <CorrectionCard key={correction.issue} correction={correction} />
              ))}
            </div>
          </div>
        )}

        {result.cues.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionLabel colour={lift.colour} icon="ti-target">
              Coaching cues
            </SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {result.cues.map((cue, i) => (
                <div key={cue} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: lift.colour, lineHeight: 1.2, flexShrink: 0, width: 20, textAlign: "center" }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "#D0D0D0", lineHeight: 1.6 }}>{cue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={onAnalyseAnother}
            style={{ background: lift.colour, color: "#fff", border: "none", borderRadius: 14, padding: 17, fontFamily: FONT_DISPLAY, fontSize: 21, letterSpacing: "0.08em", cursor: "pointer" }}
          >
            ANALYSE ANOTHER REP
          </button>
          <button
            className="btn-sec"
            onClick={onChangeLift}
            style={{ background: "none", color: "#555", border: `1px solid ${COLOURS.border}`, borderRadius: 14, padding: 15, fontFamily: FONT_DISPLAY, fontSize: 18, letterSpacing: "0.08em", cursor: "pointer" }}
          >
            CHANGE LIFT
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Legend() {
  const swatch = (colour: string, label: string) => (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 12, height: 3, background: colour, borderRadius: 2 }} /> {label}
    </span>
  );
  return (
    <div style={{ display: "flex", gap: 14, marginBottom: 12, fontSize: 11, color: "#777", alignItems: "center" }}>
      {swatch(COLOURS.good, "Good")}
      {swatch(COLOURS.bad, "Issue area")}
    </div>
  );
}

function FrameStrip({ frames, poses, problemParts }: { frames: string[]; poses: Pose[]; problemParts: Set<BodyPart> }) {
  const total = String(frames.length).padStart(2, "0");
  return (
    <div
      className="frame-strip"
      style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 -18px", padding: "0 18px", scrollbarWidth: "none" }}
    >
      {frames.map((frame, i) => (
        <div key={i} className="frame-card" style={{ width: 220, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLOURS.border}`, background: COLOURS.surface }}>
          <div style={{ position: "relative", aspectRatio: "9/16", background: "#000" }}>
            <img src={`data:image/jpeg;base64,${frame}`} alt={`Frame ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <SkeletonOverlay pose={poses[i] ?? null} problemParts={problemParts} />
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: "#000000B0",
                color: "#fff",
                padding: "3px 8px",
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
              }}
            >
              {String(i + 1).padStart(2, "0")} / {total}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CorrectionCard({ correction }: { correction: Correction }) {
  const style = PRIORITY_STYLES[correction.priority];
  return (
    <div style={{ background: style.bg, border: `1px solid ${style.border}`, borderRadius: 12, padding: "13px 15px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#E0E0E0", flex: 1, lineHeight: 1.4 }}>{correction.issue}</span>
        <span
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.1em",
            color: style.text,
            background: `${style.text}20`,
            padding: "2px 8px",
            borderRadius: 4,
            flexShrink: 0,
          }}
        >
          {style.label}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.55, marginBottom: correction.bodyParts.length ? 8 : 0 }}>
        <i className="ti ti-arrow-right" style={{ fontSize: 11, marginRight: 4 }} aria-hidden="true" />
        {correction.fix}
      </div>
      {correction.bodyParts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {correction.bodyParts.map((part) => (
            <span
              key={part}
              style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888", background: "#ffffff08", padding: "2px 7px", borderRadius: 3 }}
            >
              {part}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
