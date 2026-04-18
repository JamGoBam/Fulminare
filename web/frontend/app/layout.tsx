import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { QueryProvider } from "@/components/QueryProvider"
import { ActionStatusProvider } from "@/lib/action-status-context"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Chatbot } from "@/components/Chatbot"
import { OnboardingTour } from "@/components/OnboardingTour"
import { Sidebar } from "@/components/Sidebar"
import { TopBar } from "@/components/TopBar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Prince of Peace — Operations Hub",
  description: "3-DC inventory imbalance and chargeback detection",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <QueryProvider>
          <ActionStatusProvider>
            <TooltipProvider>
              <div className="flex h-screen bg-slate-50">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <TopBar />
                  <main className="flex-1 overflow-auto">
                    {children}
                  </main>
                </div>
              </div>
              <Chatbot />
              <OnboardingTour />
            </TooltipProvider>
          </ActionStatusProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
