import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({
  variable: "--font-inter",
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
  themeColor: "#f5a623",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
