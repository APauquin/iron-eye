import type { Lift } from "../types.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";

interface TopBarProps {
  lift?: Lift;
  onBack?: () => void;
}

export default function TopBar({ lift, onBack }: TopBarProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 18px 0" }}>
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 20, padding: "0 6px 0 0", lineHeight: 1 }}
        >
          <i className="ti ti-arrow-left" aria-hidden="true" />
        </button>
      )}
      <span style={{ fontFamily: FONT_DISPLAY, fontSize: 26, color: lift?.colour ?? COLOURS.brand, letterSpacing: "0.04em" }}>
        IRON EYE
      </span>
      {lift && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: lift.colour,
            background: `${lift.colour}20`,
            padding: "3px 10px",
            borderRadius: 6,
          }}
        >
          {lift.name.toUpperCase()}
        </span>
      )}
    </div>
  );
}
