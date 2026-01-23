import { TopNavbar } from "@/components/TopNavbar";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { twMerge } from "tailwind-merge";
import { Footer } from "@/components/Footer";

import { ChatProvider } from "@/context/ChatContext";


const inter = Inter({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Medical Science & Physiotherapy Research",
  description:
    "Evidence-based research and clinical insights in physiotherapy, rehabilitation medicine, and movement science.",
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
          "antialiased bg-gray-100 min-h-screen flex flex-col"
        )}
      >
        <ChatProvider>
            <TopNavbar />
            <main className="flex-grow bg-gray-100 pt-16">
              <div className="bg-white min-h-[calc(100vh-4rem)] border border-transparent lg:border-neutral-200">
                {children}
              </div>
            </main>
            <Footer />
          </ChatProvider>
      </body>
    </html>
  );
}