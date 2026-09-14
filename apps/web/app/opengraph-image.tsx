import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "Orderly"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#184a33",
        gap: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* The ring mark, drawn with a border so it matches the SVG logo
            without relying on font rendering inside the OG image. */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 80,
            border: "16px solid #dbfd52",
          }}
        />
        <span
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          Orderly
        </span>
      </div>
      <span
        style={{
          fontSize: 36,
          color: "#dbfd52",
          fontWeight: 600,
        }}
      >
        Order Management
      </span>
      <span
        style={{
          fontSize: 20,
          color: "rgba(255,255,255,0.7)",
        }}
      >
        Manage and track all customer orders
      </span>
    </div>,
    { ...size }
  )
}
