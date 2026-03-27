import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mendonça Galvão - BI Dashboard',
  description: 'Painel de Inteligência Financeira e D.R.E. Analítico para Casa Brasilis Marine.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
