import type { ReactNode } from "react";

interface SectionLabelProps {
  colour: string;
  icon?: string;
  children: ReactNode;
}

/** Small uppercase heading used above each block of content. */
export default function SectionLabel({ colour, icon, children }: SectionLabelProps) {
  return (
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: colour,
        textTransform: "uppercase",
        marginBottom: 10,
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon && <i className={`ti ${icon}`} style={{ fontSize: 13 }} aria-hidden="true" />}
      {children}
    </div>
  );
}
