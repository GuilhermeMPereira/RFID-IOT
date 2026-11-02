import type { Metadata, Viewport } from 'next'
import './globals.css'
import { RegistrarSW } from './registrar-sw'

export const metadata: Metadata = {
  title: 'Auditoria NFC',
  description: 'Auditoria e inventário de patrimônio por NFC',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'Auditoria NFC', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e6e8c',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegistrarSW />
      </body>
    </html>
  )
}
