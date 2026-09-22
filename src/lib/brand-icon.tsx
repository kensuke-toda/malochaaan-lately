import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

async function loadFraunces() {
  return readFile(join(process.cwd(), "src/app/fonts/Fraunces-SemiBold.ttf"));
}

export async function brandIconResponse(size: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#B85C38",
          color: "#F4EEE4",
          fontSize: Math.round(size * 0.58),
          fontWeight: 600,
          fontFamily: "Fraunces",
          paddingLeft: Math.round(size * 0.04),
          paddingBottom: Math.round(size * 0.03),
        }}
      >
        L
      </div>
    ),
    {
      width: size,
      height: size,
      fonts: [{ name: "Fraunces", data: await loadFraunces(), style: "normal", weight: 600 }],
    },
  );
}
