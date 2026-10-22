import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "@/index.css";
import { MEROTALENT_BRAND as brand } from "@/lib/brand";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: brand.title,
    template: `%s | ${brand.name}`,
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
  metadataBase: new URL(brand.origin),
  icons: { icon: brand.logo, apple: brand.logo },
  openGraph: {
    title: brand.title,
    description:
      "A performance-first talent ecosystem for Nepal and South Asia.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: brand.themeColor,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
