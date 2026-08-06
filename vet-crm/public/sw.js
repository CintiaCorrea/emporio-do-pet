/**
 * Service worker da EQUIPE (Empório do Pet) — SÓ PUSH.
 *
 * De propósito faz o mínimo: recebe a notificação (push) e abre a tela certa
 * quando a pessoa toca. NÃO intercepta navegação nem guarda /api em cache —
 * assim nunca serve código velho (o app continua atualizando normal ao recarregar).
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let dados = {};
  try { dados = event.data ? event.data.json() : {}; } catch (e) { dados = {}; }
  const titulo = dados.titulo || 'Empório do Pet';
  const opcoes = {
    body: dados.texto || '',
    icon: '/images/logo.png',
    badge: '/images/logo.png',
    tag: dados.tag || undefined,
    renotify: !!dados.tag,
    requireInteraction: true, // fica na tela até a pessoa interagir
    data: { url: dados.url || '/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(titulo, opcoes));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientes) => {
      for (const c of clientes) {
        // Já tem uma aba aberta? Foca nela e navega pro destino.
        if ('focus' in c) {
          try { c.navigate(destino); } catch (e) { /* navigate pode falhar em alguns navegadores */ }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(destino);
    }),
  );
});
