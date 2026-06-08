import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import LanguageSwitcher from "@/components/i18n/LanguageSwitcher";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getServerLanguage } from "@/lib/i18n/server";
import { DEFAULT_OG_IMAGE, SITE_NAME, getMetadataBase } from "@/lib/seo";
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
  metadataBase: getMetadataBase(),
  title: {
    default: "Yamaha Bangladesh AI Ride Personality Campaign",
    template: "%s | Yamaha Bangladesh",
  },
  description:
    "Join Yamaha Bangladesh's AI Ride Personality Campaign to discover your rider persona, get matched with a Yamaha bike, and create a shareable cinematic portrait built for riders across Bangladesh.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Yamaha Bangladesh AI Ride Personality Campaign",
    description:
      "Discover your Yamaha rider persona, explore your ideal bike match, and generate a cinematic AI portrait designed for Yamaha fans in Bangladesh.",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_BD",
    type: "website",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        alt: "Yamaha Bangladesh AI Ride Personality Campaign",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Yamaha Bangladesh AI Ride Personality Campaign",
    description:
      "Find your Yamaha rider persona and create a cinematic AI portrait tailored for Bangladesh's riding community.",
    images: [DEFAULT_OG_IMAGE],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLanguage = await getServerLanguage();

  return (
    <html
      lang={initialLanguage}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} app-root`}
    >
      <body className="app-body">
        <LanguageProvider initialLanguage={initialLanguage}>
          <LanguageSwitcher />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
