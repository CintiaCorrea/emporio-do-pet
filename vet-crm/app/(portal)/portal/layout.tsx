import type { Metadata, Viewport } from 'next';

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
  appleWebApp: {
    capable: true,
    title: 'Empório do Pet',
    statusBarStyle: 'black-translucent',
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
      {children}
    </>
  );
}
