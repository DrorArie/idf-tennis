import type { Metadata, Viewport } from "next";
import { Karantina, Rubik } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
});

// Condensed scoreboard-style display face for big numbers and headlines
const karantina = Karantina({
  variable: "--font-karantina",
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://idf-tennis.vercel.app"),
  title: "טניס צה״ל",
  description: "הרשמה לאימוני טניס שבועיים",
  applicationName: "טניס צה״ל",
  appleWebApp: { capable: true, title: "טניס צה״ל" },
  openGraph: {
    title: "טניס צה״ל",
    description: "הרשמה לאימוני טניס שבועיים",
    siteName: "טניס צה״ל",
    locale: "he_IL",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f2f57",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${karantina.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <Script src="https://dror-apps.vercel.app/menu.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
