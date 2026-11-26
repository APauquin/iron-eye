import type { ReactNode } from "react";
import type { Lift } from "../types.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";

interface ModalProps {
  lift: Lift;
  title: string;
  children: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
  onPrimary?: () => void;
  onSecondary: () => void;
}

const buttonBase = {
  flex: 1,
  borderRadius: 12,
  padding: "13px 12px",
  cursor: "pointer",
  fontFamily: FONT_DISPLAY,
  fontSize: 17,
  letterSpacing: "0.08em",
} as const;

export default function Modal({ lift, title, children, primaryLabel, secondaryLabel = "Cancel", onPrimary, onSecondary }: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 20,
        background: "#000000B8",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 390,
          borderRadius: 18,
          background: COLOURS.surface,
          border: `1px solid ${lift.colour}35`,
          boxShadow: "0 24px 60px #00000080",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "18px 18px 12px", borderBottom: `1px solid ${COLOURS.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `${lift.colour}18`,
              border: `1px solid ${lift.colour}30`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <i className={`ti ${lift.icon}`} style={{ fontSize: 21, color: lift.colour }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, letterSpacing: "0.04em", color: COLOURS.text }}>{title}</div>
            <div style={{ fontSize: 12, color: lift.colour, fontWeight: 600 }}>{lift.name}</div>
          </div>
        </div>

        <div style={{ padding: 18 }}>{children}</div>

        <div style={{ display: "flex", gap: 10, padding: "0 18px 18px" }}>
          <button onClick={onSecondary} style={{ ...buttonBase, background: "none", color: "#777", border: "1px solid #2a2a2a" }}>
            {secondaryLabel}
          </button>
          {primaryLabel && onPrimary && (
            <button onClick={onPrimary} style={{ ...buttonBase, background: lift.colour, color: "#fff", border: "none" }}>
              {primaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
