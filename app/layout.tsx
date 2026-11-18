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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f2f57" },
    { media: "(prefers-color-scheme: dark)", color: "#0f2f57" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${karantina.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){var e=document.documentElement;function n(){var t=new Date(),r=Math.PI/180,g=2*Math.PI/365*(Math.floor((t-new Date(t.getFullYear(),0,0))/864e5)-1),q=229.18*(75e-6+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g)),d=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+907e-6*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g),l=31.8*r,h=Math.acos(Math.cos(90.833*r)/(Math.cos(l)*Math.cos(d))-Math.tan(l)*Math.tan(d))/r,m=t.getUTCHours()*60+t.getUTCMinutes();return m<579-4*h-q||m>579+4*h-q}function a(){var t="auto";try{t=localStorage.getItem("drorTheme")||"auto"}catch(x){}var d=t==="dark"||(t==="auto"&&n());e.setAttribute("data-theme",d?"dark":"light");e.style.colorScheme=d?"dark":"light"}a();setInterval(a,3e5);new MutationObserver(function(){if(!e.hasAttribute("data-theme"))a()}).observe(e,{attributes:true,attributeFilter:["data-theme"]})})()',
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <Script src="https://dror-apps.vercel.app/menu.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
