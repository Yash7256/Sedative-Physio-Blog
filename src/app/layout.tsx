import { TopNavbar } from "@/components/TopNavbar";
import { StickyNavbar } from "@/components/homepage/StickyNavbar";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { twMerge } from "tailwind-merge";
import { Footer } from "@/components/Footer";
import LoadingWrapper from "@/components/LoadingWrapper";

import { ChatProvider } from "@/context/ChatContext";


const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Sedative Physio | BPT Learning Platform",
  description:
    "Master Physiotherapy with expert-led courses built exclusively for BPT students. Learn from practicing clinicians, earn recognized certifications.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={twMerge(
          inter.className,
          "antialiased bg-white min-h-screen flex flex-col"
        )}
      >
        <ChatProvider>
          <StickyNavbar />
          <LoadingWrapper>
            {children}
            <Footer />
          </LoadingWrapper>
        </ChatProvider>
      </body>
    </html>
  );
}