import { ImageResponse } from "next/og";

export const alt = "Luxus Asaad — VTC électrique à Dakar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#fff",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            width: 220,
            height: 220,
            borderRadius: 9999,
            border: "8px solid #c9a24a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 96,
            fontWeight: 700,
            color: "#e6c97a",
          }}
        >
          LA
        </div>
        <div style={{ marginTop: 40, fontSize: 72, fontWeight: 700, display: "flex" }}>
          Luxus <span style={{ color: "#e6c97a", marginLeft: 18 }}>Asaad</span>
        </div>
        <div style={{ marginTop: 16, fontSize: 36, color: "#ddd" }}>VTC électrique avec chauffeur à Dakar</div>
      </div>
    ),
    size,
  );
}
