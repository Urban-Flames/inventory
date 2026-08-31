import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Restaurant Inventory Management",
  description: "Track kitchen, main stock, bar, transfers, and daily XPS sales.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <span className="text-sm font-medium text-muted-foreground">
                  Inventory System
                </span>
              </div>
            </header>
            <main className="flex-1 overflow-auto p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}