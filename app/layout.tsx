import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Memora - AI-Powered Learning Platform',
  description: 'Master any subject with AI-generated curricula and advanced memorization techniques',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-blue-500/40 selection:text-white">
        {children}
      </body>
    </html>
  )
}
