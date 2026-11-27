import { useState } from "react";
import { COLOURS } from "../theme.ts";

interface HeightInputProps {
  value: number | null;
  colour: string;
  onChange: (value: number | null) => void;
}

const MIN_CM = 100;
const MAX_CM = 250;

/** Lifter height in cm. Used as the ruler that turns pixels into centimetres and m/s. */
export default function HeightInput({ value, colour, onChange }: HeightInputProps) {
  const [text, setText] = useState(value ? String(value) : "");
  const parsed = Number(text);
  const invalid = text !== "" && (!Number.isFinite(parsed) || parsed < MIN_CM || parsed > MAX_CM);

  const update = (next: string) => {
    setText(next);
    const number = Number(next);
    onChange(next !== "" && Number.isFinite(number) && number >= MIN_CM && number <= MAX_CM ? number : null);
  };

  return (
    <div style={{ background: COLOURS.surface, border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <i className="ti ti-ruler-measure" style={{ fontSize: 18, color: colour, flexShrink: 0 }} aria-hidden="true" />
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontSize: 13, color: COLOURS.text, fontWeight: 600 }}>Your height</span>
          <span style={{ display: "block", fontSize: 11, color: "#666", marginTop: 2 }}>Turns bar movement into cm and m/s · saved on this device</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_CM}
            max={MAX_CM}
            placeholder="175"
            value={text}
            onChange={(e) => update(e.target.value)}
            aria-invalid={invalid}
            style={{
              width: 72,
              background: "#0a0a0a",
              border: `1px solid ${invalid ? COLOURS.bad : "#2a2a2a"}`,
              borderRadius: 8,
              color: COLOURS.text,
              fontSize: 15,
              padding: "7px 8px",
              textAlign: "right",
              fontFamily: "inherit",
            }}
          />
          <span style={{ fontSize: 12, color: "#777" }}>cm</span>
        </span>
      </label>
      {invalid && (
        <div role="alert" style={{ fontSize: 11, color: COLOURS.badText, marginTop: 8 }}>
          Enter a height between {MIN_CM} and {MAX_CM} cm.
        </div>
      )}
    </div>
  );
}
