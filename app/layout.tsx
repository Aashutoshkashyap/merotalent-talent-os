import type { Metadata, Viewport } from "next";
import "@/index.css";

export const metadata: Metadata = {
  title: {
    default: "Merotalent — Talent meets opportunity",
    template: "%s | Merotalent",
  },
  description:
    "Discover competitions, jobs, courses and mentorship across Nepal and South Asia. Build a proof-of-skill profile and get discovered.",
  keywords: [
    "talent platform",
    "jobs Nepal",
    "competitions",
    "mentorship",
    "courses",
    "skill-based hiring",
  ],
  metadataBase: new URL("https://merotalent.vercel.app"),
  openGraph: {
    title: "Merotalent — Talent meets opportunity",
    description:
      "A performance-first talent ecosystem for Nepal and South Asia.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#c2410c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
