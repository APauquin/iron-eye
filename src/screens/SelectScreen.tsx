import { useState } from "react";
import GuidelineList from "../components/GuidelineList.tsx";
import Modal from "../components/Modal.tsx";
import Shell from "../components/Shell.tsx";
import TopBar from "../components/TopBar.tsx";
import { LIFTS } from "../config/lifts.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";
import type { Lift } from "../types.ts";

export default function SelectScreen({ onSelect }: { onSelect: (lift: Lift) => void }) {
  const [previewing, setPreviewing] = useState<Lift | null>(null);

  return (
    <>
      <Shell>
        <TopBar />

        <div style={{ padding: "28px 18px 16px" }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 46, lineHeight: 0.95, color: COLOURS.text }}>
            CHOOSE
            <br />
            YOUR LIFT
          </h1>
          <p style={{ color: COLOURS.muted, fontSize: 13, marginTop: 8 }}>Upload a video — AI reviews your form in seconds</p>
        </div>

        <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
          {LIFTS.map((lift) => (
            <LiftCard key={lift.id} lift={lift} onClick={() => setPreviewing(lift)} />
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#2a2a2a", letterSpacing: "0.1em", textTransform: "uppercase", padding: "24px 0 12px" }}>
          Powered by Claude Vision
        </p>
      </Shell>

      {previewing && (
        <Modal
          lift={previewing}
          title={previewing.available ? "Video checklist" : "Coming soon"}
          primaryLabel={previewing.available ? "I understand" : undefined}
          secondaryLabel={previewing.available ? "Back" : "Close"}
          onPrimary={() => onSelect(previewing)}
          onSecondary={() => setPreviewing(null)}
        >
          <p style={{ fontSize: 13, color: "#777", lineHeight: 1.55, marginBottom: 12 }}>
            {previewing.available
              ? `Before uploading, film your ${previewing.name.toLowerCase()} in this format so Iron Eye can analyse your form correctly.`
              : `${previewing.name} analysis is not available yet. Here is the video format that will be required when it launches.`}
          </p>
          <GuidelineList lift={previewing} />
        </Modal>
      )}
    </>
  );
}

function LiftCard({ lift, onClick }: { lift: Lift; onClick: () => void }) {
  return (
    <button
      className="lift-card"
      onClick={onClick}
      style={{
        background: lift.available ? COLOURS.surface : "#0d0d0d",
        border: `1px solid ${lift.available ? COLOURS.border : `${lift.colour}25`}`,
        borderRadius: 16,
        padding: "18px 20px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 16,
        textAlign: "left",
        color: COLOURS.text,
        opacity: lift.available ? 1 : 0.72,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 12,
          background: `${lift.colour}18`,
          border: `1px solid ${lift.colour}30`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <i className={`ti ${lift.icon}`} style={{ fontSize: 22, color: lift.colour }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 24, letterSpacing: "0.04em" }}>{lift.name}</div>
          {!lift.available && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: lift.colour,
                background: `${lift.colour}18`,
                border: `1px solid ${lift.colour}30`,
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              COMING SOON
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: COLOURS.muted, marginTop: 1 }}>{lift.desc}</div>
      </div>
      <i
        className={`ti ${lift.available ? "ti-chevron-right" : "ti-lock"}`}
        style={{ color: lift.available ? "#333" : lift.colour, fontSize: 18 }}
        aria-hidden="true"
      />
    </button>
  );
}
