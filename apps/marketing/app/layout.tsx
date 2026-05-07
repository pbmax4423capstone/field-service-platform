import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FieldPro — Field Service Management Software',
  description:
    'AI-powered field service management for HVAC contractors. Automate scheduling, invoicing, and customer communication.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
