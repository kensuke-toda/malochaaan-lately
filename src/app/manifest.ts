import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lately",
    short_name: "Lately",
    description: "Ken とパートナーの近況。行った場所と、好きなもの。",
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
