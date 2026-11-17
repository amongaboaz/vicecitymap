import { ImageResponse } from "next/og";

export const alt = "ViceCityMap — the independent GTA 6 discovery map";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const dots = Array.from({ length: 28 }, (_, i) => ({
    x: 640 + ((i * 137) % 480),
    y: 90 + ((i * 89) % 440),
    c: ["#5CF28B", "#FF8A3D", "#62C6F2", "#C9A7FF", "#F2C94C"][i % 5],
  }));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#050607", color: "#F2F4F6", fontFamily: "sans-serif", position: "relative" }}>
        <div style={{ position: "absolute", right: 60, top: 60, width: 520, height: 510, borderRadius: 32, background: "#121519", border: "2px solid rgba(92,242,139,0.35)", display: "flex" }} />
        {dots.map((d, i) => (
          <div key={i} style={{ position: "absolute", left: d.x, top: d.y, width: 14, height: 14, borderRadius: 14, background: d.c, boxShadow: `0 0 18px ${d.c}` }} />
        ))}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 72, width: 640 }}>
          <div style={{ fontSize: 26, color: "#5CF28B", letterSpacing: 6 }}>VICECITYMAP</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, marginTop: 24 }}>Every discovery.</div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, color: "#5CF28B" }}>One map.</div>
          <div style={{ fontSize: 26, color: "#9AA3AD", marginTop: 28 }}>Independent GTA 6 interactive map · $10 lifetime Premium</div>
          <div style={{ fontSize: 18, color: "#6B737D", marginTop: 40 }}>Unofficial fan project · Not affiliated with Rockstar Games</div>
        </div>
      </div>
    ),
    size,
  );
}
