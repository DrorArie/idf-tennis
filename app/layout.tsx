import type { Metadata, Viewport } from "next";
import { Karantina, Rubik } from "next/font/google";
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
  title: "טניס צה״ל",
  description: "הרשמה לאימוני טניס שבועיים",
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
      <body className="min-h-full">{children}</body>
    </html>
  );
}
