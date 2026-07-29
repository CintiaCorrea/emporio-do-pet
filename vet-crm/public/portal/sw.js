/**
 * Service worker do Portal do Tutor.
 *
 * ⚠️ ESCOPO: este arquivo mora em /portal/, então o escopo é /portal/ e ele
 * NUNCA intercepta o app da equipe. Se algum dia for movido para a raiz, ele
 * passa a mandar em TODO o site — não mover.
 *
 * O que ele faz, de propósito bem pouco:
 *  · guarda a casca (ícones, manifesto) para o app abrir rápido;
 *  · quando o celular está sem internet, mostra um aviso em vez da tela de erro
 *    do navegador;
 *  · recebe as notificações (push) e abre a tela certa quando o tutor toca.
 *
 * O que ele NÃO faz, por segurança: nunca guarda resposta de /api/. São dados de
 * saúde e sessão — não podem ficar em cache no aparelho.
 */

const VERSAO = 'ptl-v1';
const CASCA = [
  '/portal/manifest.json',
  '/portal/icone-192.png',
  '/portal/icone-512.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(VERSAO).then((cache) => cache.addAll(CASCA)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Dado de saúde e sessão nunca entram em cache.
  if (url.pathname.startsWith('/api/')) return;

  // Navegação: tenta a rede; sem internet, avisa com jeitinho.
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req).catch(
        () =>
          new Response(
            `<!doctype html><meta charset="utf-8">
             <meta name="viewport" content="width=device-width,initial-scale=1">
             <title>Sem internet</title>
             <div style="font-family:-apple-system,Segoe UI,sans-serif;background:#FAFCFD;
                         color:#0D2048;min-height:100vh;display:flex;align-items:center;
                         justify-content:center;text-align:center;padding:24px">
               <div>
                 <div style="font-size:44px">🐾</div>
                 <h1 style="font-size:18px;margin:10px 0 6px">Sem internet agora</h1>
                 <p style="font-size:14px;color:#5F5E5A;line-height:1.5">
                   Quando a conexão voltar, seus dados aparecem de novo.
                 </p>
               </div>
             </div>`,
            { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 },
          ),
      ),
    );
    return;
  }

  // Ícones e manifesto: cache primeiro (mudam quase nunca).
  if (CASCA.includes(url.pathname)) {
    evento.respondWith(
      caches.match(req).then((achou) => achou || fetch(req)),
    );
  }
});

// ---------------------------------------------------------------------------
// Notificações
// ---------------------------------------------------------------------------
self.addEventListener('push', (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { titulo: 'Empório do Pet', texto: evento.data ? evento.data.text() : '' };
  }

  const titulo = dados.titulo || 'Empório do Pet';
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.texto || '',
      icon: '/portal/icone-192.png',
      badge: '/portal/icone-192.png',
      lang: 'pt-BR',
      tag: dados.tag || undefined,
      data: { url: dados.url || '/portal' },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || '/portal';

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((janelas) => {
      // Já está aberto? Traz para frente em vez de abrir outra aba.
      for (const j of janelas) {
        if (j.url.includes('/portal') && 'focus' in j) {
          j.navigate(destino);
          return j.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
