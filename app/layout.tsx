import type { Metadata } from "next"
import { Inter } from 'next/font/google'
import "./globals.css"

const inter = Inter({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],  // Specify all weights
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Choreo - Your 3-Minute AI Work Journal",
  description: "Voice reflections → AI summaries → Productivity insights. Privacy-first work journal for knowledge workers.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}