import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Backgrndy',
  description: 'AI-powered resume parsing and enrichment',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
