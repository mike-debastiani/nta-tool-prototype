import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NTA – Antrag (Prototyp)",
  description: "Prototyp der Desktop-Ansicht – Persönliche Angaben",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={cn("h-full antialiased", dmSans.variable)}>
      <body className={cn("min-h-full flex flex-col font-sans", dmSans.className)}>
        {children}
      </body>
    </html>
  );
}
