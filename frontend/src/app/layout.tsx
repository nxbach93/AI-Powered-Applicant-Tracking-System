import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI-Powered ATS Portal",
  description: "Hệ thống Quản lý Tuyển dụng & Sàng lọc Hồ sơ Ứng viên bằng AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50">
        <AuthProvider>
          <Suspense fallback={<header className="h-16 bg-white border-b border-slate-200" />}>
            <Navbar />
          </Suspense>
          <div className="flex-1">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
