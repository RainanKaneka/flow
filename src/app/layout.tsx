import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Flow — Gestão de Rotina & Alta Performance',
  description: 'Aplicativo minimalista para dominar a rotina pessoal progressiva em 3 níveis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{children}</body>
    </html>
  );
}
