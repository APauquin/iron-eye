import type { Lift } from "../types.ts";

export default function GuidelineList({ lift }: { lift: Lift }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lift.guidelines.map((item) => (
        <div key={item} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: "#B8B8B8", lineHeight: 1.45 }}>
          <i className="ti ti-check" style={{ color: lift.colour, fontSize: 15, marginTop: 1, flexShrink: 0 }} aria-hidden="true" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
