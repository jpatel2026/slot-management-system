import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Geist_Mono } from "next/font/google"
import "./globals.css"
import { ClientLayout } from "@/components/client-layout"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "NextGen Slot Manager",
  description: "Cell & Gene Therapy Supply Chain Capacity Management",
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full bg-[#F3F3F3]">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
}
