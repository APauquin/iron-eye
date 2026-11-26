import Shell from "../components/Shell.tsx";
import { FONT_DISPLAY } from "../theme.ts";
import type { Lift } from "../types.ts";

export default function AnalysingScreen({ lift, status }: { lift: Lift; status: string }) {
  return (
    <Shell accent={lift.colour} centered>
      <div style={{ textAlign: "center", padding: "0 30px" }} role="status" aria-live="polite">
        <div
          style={{
            width: 72,
            height: 72,
            margin: "0 auto 24px",
            border: "3px solid #1e1e1e",
            borderTop: `3px solid ${lift.colour}`,
            borderRadius: "50%",
            animation: "spin 0.9s linear infinite",
          }}
        />
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 34, letterSpacing: "0.05em", marginBottom: 10 }}>ANALYSING</div>
        <div style={{ color: "#555", fontSize: 13 }}>{status}</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 18 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="dot" style={{ width: 7, height: 7, borderRadius: "50%", background: lift.colour }} />
          ))}
        </div>
      </div>
    </Shell>
  );
}
