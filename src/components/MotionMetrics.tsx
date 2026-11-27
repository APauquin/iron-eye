import type { MotionResult } from "../types.ts";
import { COLOURS, FONT_DISPLAY } from "../theme.ts";

interface Tile {
  label: string;
  value: string;
  unit?: string;
  note?: string;
}

const fixed = (value: number | null, digits: number) => (value === null ? "—" : value.toFixed(digits));

function buildTiles(motion: MotionResult, isSquat: boolean): Tile[] {
  const m = motion.metrics;
  const t0 = motion.series.t[0];
  const tiles: Tile[] = [
    { label: "Avg speed up", value: fixed(m.meanVelocity, 2), unit: "m/s", note: "Mean concentric velocity" },
    { label: "Peak speed", value: fixed(m.peakVelocity, 2), unit: "m/s", note: `at ${(m.peakVelocityT - t0).toFixed(2)} s` },
    { label: "Range of motion", value: fixed(m.romCm, 0), unit: "cm" },
    { label: "Time up", value: m.concentricS.toFixed(2), unit: "s" },
    m.stickingPointT === null
      ? { label: "Sticking point", value: "None", note: "Smooth speed the whole way up" }
      : {
          label: "Sticking point",
          value: (m.stickingPointT - t0).toFixed(2),
          unit: "s",
          note: m.stickingPointHeightCm === null ? "Bar slowed here" : `${m.stickingPointHeightCm.toFixed(0)} cm above the bottom`,
        },
    { label: "Bar drift", value: fixed(m.maxDriftCm, 1), unit: "cm", note: "Furthest from a straight line up" },
  ];
  if (isSquat && m.descentS !== null) {
    tiles.push({ label: "Time down", value: m.descentS.toFixed(2), unit: "s", note: m.descentVelocity === null ? undefined : `${m.descentVelocity.toFixed(2)} m/s` });
  }
  return tiles;
}

export default function MotionMetrics({ motion, isSquat }: { motion: MotionResult; isSquat: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {buildTiles(motion, isSquat).map((tile) => (
        <div key={tile.label} style={{ background: COLOURS.surface, border: "1px solid #1a1a1a", borderRadius: 12, padding: "11px 13px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#777" }}>{tile.label}</div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 30, lineHeight: 1, color: COLOURS.text }}>{tile.value}</span>
            {tile.unit && tile.value !== "—" && tile.value !== "None" && <span style={{ fontSize: 12, color: "#888" }}>{tile.unit}</span>}
          </div>
          {tile.note && <div style={{ fontSize: 11, color: "#666", marginTop: 4, lineHeight: 1.35 }}>{tile.note}</div>}
        </div>
      ))}
    </div>
  );
}
