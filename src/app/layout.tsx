import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PrecioUY — Monitor de Precios Uruguay',
  description: 'Comparador de precios de supermercados uruguayos en tiempo real',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
