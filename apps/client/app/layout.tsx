import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import Breadcrumbs from "@/components/Breadcrumbs";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shailaja IAS - UPSC Preparation Platform",
  description: "Comprehensive UPSC preparation with daily news, magazines, quizzes, and video courses",
  keywords: ["UPSC", "IAS", "Civil Services", "Prelims", "Mains", "Current Affairs"],
  authors: [{ name: "Shailaja IAS" }],
  openGraph: {
    title: "Shailaja IAS - UPSC Preparation Platform",
    description: "Comprehensive UPSC preparation with daily news, magazines, quizzes, and video courses",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1E3A5F",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: 'light' }}>
      <body className={`${inter.variable} ${playfair.variable} antialiased`}>
        <Providers>
          <Header />
          <Breadcrumbs />
          {children}
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
