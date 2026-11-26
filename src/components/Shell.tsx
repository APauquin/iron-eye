import type { CSSProperties, ReactNode } from "react";
import { COLOURS, FONT_BODY } from "../theme.ts";

interface ShellProps {
  accent?: string;
  centered?: boolean;
  children: ReactNode;
}

/** Phone-width page frame shared by every screen. */
export default function Shell({ accent = COLOURS.brand, centered = false, children }: ShellProps) {
  const style = {
    "--accent": accent,
    fontFamily: FONT_BODY,
    background: COLOURS.background,
    color: COLOURS.text,
    minHeight: "100dvh",
    maxWidth: 430,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    ...(centered && { alignItems: "center", justifyContent: "center" }),
  } as CSSProperties;

  return <div style={style}>{children}</div>;
}
