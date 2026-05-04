import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BetGenius AI — Football Match Analysis',
  description: 'AI-powered football match analysis. Data-driven predictions for all global leagues.',
  themeColor: '#0A0E1A',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
  openGraph: {
    title: 'BetGenius AI',
    description: 'AI-powered football match analysis powered by Claude AI',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'BetGenius AI' }],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
