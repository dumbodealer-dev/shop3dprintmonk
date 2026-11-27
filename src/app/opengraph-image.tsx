import { ImageResponse } from "next/og";

export const alt = "3D PRINTMONK — From One Prototype to Bulk Production";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#120d0a",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 4 }}>
          3D PRINT<span style={{ color: "#ff6a13" }}>MONK</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 950 }}>From One Prototype to Bulk Production.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#bcafa5" }}>FDM & SLA 3D printing · Design · Finishing · New Delhi · India & worldwide delivery</div>
        </div>
        <div style={{ display: "flex", height: 6, width: 160, background: "#ff6a13", borderRadius: 3 }} />
      </div>
    ),
    size,
  );
}
