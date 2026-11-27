import BarPathChart from "../components/BarPathChart.tsx";
import MotionMetrics from "../components/MotionMetrics.tsx";
import SectionLabel from "../components/SectionLabel.tsx";
import Shell from "../components/Shell.tsx";
import SkeletonOverlay from "../components/SkeletonOverlay.tsx";
import TopBar from "../components/TopBar.tsx";
import VelocityChart from "../components/VelocityChart.tsx";
import { BODY_PARTS, PRIORITY_STYLES } from "../config/lifts.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";
import type { ReactNode } from "react";
import type { AnalysisResult, BodyPart, ClipCapture, Correction, Lift, MotionResult, Pose } from "../types.ts";

interface ResultsScreenProps {
  lift: Lift;
  capture: ClipCapture;
  motion: MotionResult | null;
  motionError: string | null;
  coach: AnalysisResult | null;
  coachError: string | null;
  onAnalyseAnother: () => void;
  onChangeLift: () => void;
}

const divider = <div style={{ width: "100%", height: 1, background: "#161616", margin: "4px 0 22px" }} />;

export default function ResultsScreen({ lift, capture, motion, motionError, coach, coachError, onAnalyseAnother, onChangeLift }: ResultsScreenProps) {
  const problemParts = new Set<BodyPart>(
    (coach?.corrections ?? []).flatMap((c) => c.bodyParts).filter((part) => BODY_PARTS.includes(part)),
  );
  const corrections = [...(coach?.corrections ?? [])].sort((a, b) => PRIORITY_STYLES[a.priority].order - PRIORITY_STYLES[b.priority].order);
  const notices = [...(motion?.warnings ?? []), ...(motionError ? [motionError] : [])];

  return (
    <Shell accent={lift.colour}>
      <TopBar lift={lift} onBack={onAnalyseAnother} />

      <div className="scroll" style={{ flex: 1, padding: "20px 18px 40px" }}>
        {notices.length > 0 && <Notices messages={notices} />}

        {motion && (
          <>
            <Section colour={lift.colour} icon="ti-gauge" title="Bar speed">
              <MotionMetrics motion={motion} isSquat={lift.id === "squat"} />
            </Section>
            <Section colour={lift.colour} icon="ti-chart-line" title="Speed over time">
              <VelocityChart motion={motion} colour={lift.colour} />
            </Section>
            <Section colour={lift.colour} icon="ti-route" title="Bar path">
              <BarPathChart motion={motion} colour={lift.colour} />
            </Section>
            <p style={{ fontSize: 11, color: "#555", lineHeight: 1.5, marginBottom: 22 }}>
              Measured locally from {motion.series.t.length} frames, tracking your {motion.side} hand as the bar. Most accurate when filmed from the
              side with a still camera.
            </p>
            {divider}
          </>
        )}

        {capture.keyFrames.length > 0 && (
          <Section colour={lift.colour} icon="ti-camera" title="Key frames">
            <Legend />
            <FrameStrip frames={capture.keyFrames} poses={capture.keyPoses} problemParts={problemParts} width={capture.width} height={capture.height} />
          </Section>
        )}

        {divider}

        {coachError && (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel colour="#888" icon="ti-message-off">
              Coach notes unavailable
            </SectionLabel>
            <p style={{ fontSize: 13, color: "#777", lineHeight: 1.5 }}>{coachError} The measurements above don't depend on the AI.</p>
          </div>
        )}

        {coach && (
          <>
            <Section colour={lift.colour} icon="ti-message-circle" title="Coach summary">
              <p style={{ fontSize: 14, color: "#B8B8B8", lineHeight: 1.65 }}>{coach.summary}</p>
            </Section>

            {coach.strengths.length > 0 && (
              <Section colour={COLOURS.good} icon="ti-circle-check" title="Strengths">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {coach.strengths.map((strength) => (
                    <div
                      key={strength}
                      style={{ background: "#22C55E0e", border: "1px solid #22C55E1a", borderRadius: 10, padding: "10px 13px", fontSize: 13, color: "#E0E0E0", lineHeight: 1.5 }}
                    >
                      {strength}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {corrections.length > 0 && (
              <Section colour={COLOURS.badText} icon="ti-alert-triangle" title="Fix these">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {corrections.map((correction) => (
                    <CorrectionCard key={correction.issue} correction={correction} />
                  ))}
                </div>
              </Section>
            )}

            {coach.cues.length > 0 && (
              <Section colour={lift.colour} icon="ti-target" title="Coaching cues">
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {coach.cues.map((cue, i) => (
                    <div key={cue} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, color: lift.colour, lineHeight: 1.2, flexShrink: 0, width: 20, textAlign: "center" }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: "#D0D0D0", lineHeight: 1.6 }}>{cue}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
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

function Section({ colour, icon, title, children }: { colour: string; icon: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <SectionLabel colour={colour} icon={icon}>
        {title}
      </SectionLabel>
      {children}
    </div>
  );
}

function Notices({ messages }: { messages: string[] }) {
  return (
    <div
      role="status"
      style={{ background: "#F59E0B12", border: "1px solid #F59E0B35", borderRadius: 12, padding: "11px 14px", marginBottom: 22, display: "flex", flexDirection: "column", gap: 6 }}
    >
      {messages.map((message) => (
        <div key={message} style={{ display: "flex", gap: 8, fontSize: 12, color: "#E8C27A", lineHeight: 1.45 }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
          <span>{message}</span>
        </div>
      ))}
    </div>
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

interface FrameStripProps {
  frames: string[];
  poses: Pose[];
  problemParts: Set<BodyPart>;
  width: number;
  height: number;
}

function FrameStrip({ frames, poses, problemParts, width, height }: FrameStripProps) {
  const total = String(frames.length).padStart(2, "0");
  // Show each frame at its real shape so the skeleton overlay lines up with the body.
  const cardWidth = height >= width ? 200 : 300;
  return (
    <div
      className="frame-strip"
      style={{ display: "flex", gap: 10, overflowX: "auto", scrollSnapType: "x mandatory", margin: "0 -18px", padding: "0 18px", scrollbarWidth: "none" }}
    >
      {frames.map((frame, i) => (
        <div key={i} className="frame-card" style={{ width: cardWidth, borderRadius: 12, overflow: "hidden", border: `1px solid ${COLOURS.border}`, background: COLOURS.surface }}>
          <div style={{ position: "relative", aspectRatio: `${width} / ${height}`, background: "#000" }}>
            <img src={`data:image/jpeg;base64,${frame}`} alt={`Frame ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "fill", display: "block" }} />
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
