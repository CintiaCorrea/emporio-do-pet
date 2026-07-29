import type { Metadata, Viewport } from 'next';
import { RegistrarServiceWorker } from './ptl-pwa';

/**
 * Casca do Portal do Tutor.
 *
 * O portal nao usa nada da casca da equipe (menu lateral, cabecalho, tema do
 * app): e outro publico e outra marca. Aqui so entra a fonte, as metas de PWA
 * e a coluna de celular.
 */
export const metadata: Metadata = {
  title: 'Portal do Tutor — Empório do Pet',
  description: 'A saúde do seu pet na palma da mão.',
  // Instalável na tela inicial (Fatia 6). O escopo do manifesto e do service
  // worker é /portal/ — o app da equipe não é afetado.
  manifest: '/portal/manifest.json',
  applicationName: 'Empório do Pet',
  appleWebApp: {
    capable: true,
    title: 'Empório do Pet',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/portal/icone-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/portal/icone-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/portal/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0D2048',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Nunito é a fonte do protótipo. */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap"
      />
      <RegistrarServiceWorker />
      {children}
    </>
  );
}
