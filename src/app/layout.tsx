import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Medivue Healthcare and wellness platform",
  keywords: [
    "Medivue",
    "Healthcare",
    "Wellness",
    "Health",
    "Medical",
    "Patient Management",
    "Health Records",
    "Wellness Platform",
    "Healthcare App", 
    "Patient Care",
    "Health Monitoring",
    "Medical Records",    ],
  description: "Admin PANEL for Medivue Healthcare and Wellness Platform",
  authors: [
    {
      name: "Medivue Team",
      url: "https://medivue.life ",
    },
  ],
  creator: "Medivue Team",
  openGraph: {
    title: "Medivue Healthcare and Wellness Platform",
    description: "Admin PANEL for Medivue Healthcare and Wellness Platform",
    url: "https://medivue.life",
    siteName: "Medivue",
    images: [
      {
        url: "https://medivue.life/og-image.png",
        width: 1200,
        height: 630,
        alt: "Medivue Healthcare and Wellness Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medivue Healthcare and Wellness Platform",
    description: "Admin PANEL for Medivue Healthcare and Wellness Platform",          
    images: ["https://medivue.life/og-image.png"],
    creator: "@medivue",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",       
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
