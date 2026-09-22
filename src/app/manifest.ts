import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lately",
    short_name: "Lately",
    description: "日々の記録",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#E8DFD0",
    theme_color: "#E8DFD0",
    lang: "ja",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
    ],
  };
}
