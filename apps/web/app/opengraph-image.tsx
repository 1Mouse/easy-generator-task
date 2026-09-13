import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "Rabbit Orders"
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
        <div
          style={{
            width: 80,
            height: 80,
            backgroundColor: "#dbfd52",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 52,
            fontWeight: 900,
            color: "#184a33",
          }}
        >
          R
        </div>
        <span
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          rabbit
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
