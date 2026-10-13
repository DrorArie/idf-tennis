import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "טניס צה״ל",
    short_name: "טניס צה״ל",
    description: "הרשמה לאימוני טניס שבועיים",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "he",
    background_color: "#f4f2ec",
    theme_color: "#0f2f57",
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
