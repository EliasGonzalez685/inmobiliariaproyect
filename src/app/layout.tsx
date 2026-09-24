import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'INMOBILIARIAPROYECT',
  description: 'Gestión centralizada de propiedades',
  manifest: '/manifest.webmanifest',
  // Ícono propio (con ?v=2 para que el navegador no reutilice el de otro proyecto en el mismo localhost).
  icons: {
    icon: [{ url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png?v=2', sizes: '512x512', type: 'image/png' }],
    shortcut: '/icon-192.png?v=2',
    apple: '/icon-192.png?v=2',
  },
  appleWebApp: { capable: true, title: 'INMOBILIARIA', statusBarStyle: 'default' },
};

export const viewport: Viewport = { themeColor: '#1f56c9', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
