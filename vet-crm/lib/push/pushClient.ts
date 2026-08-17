'use client';
// Lógica de push do navegador, num lugar só (usada pelo banner PushSetup E pela
// tela Configurações › Notificações — sem duplicar).

export function pushSuportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function permissaoPush(): NotificationPermission | 'sem-suporte' {
  if (!pushSuportado()) return 'sem-suporte';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/** Registra o service worker, assina o push e manda a inscrição pro backend. */
export async function inscreverAparelho(): Promise<void> {
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const kr = await fetch('/api/push/public-key').then((r) => r.json()).catch(() => null);
  const publicKey = kr?.publicKey;
  if (!publicKey) throw new Error('sem chave pública');
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }
  const r = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON(), userAgent: navigator.userAgent }),
  });
  if (!r.ok) throw new Error('falha ao inscrever');
}

/** Pede permissão e, se concedida, inscreve o aparelho. Retorna o resultado da permissão. */
export async function ativarPush(): Promise<NotificationPermission> {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') await inscreverAparelho();
  return perm;
}

/** Dispara um push de teste pro próprio usuário. */
export async function testarPush(): Promise<void> {
  await fetch('/api/push/test', { method: 'POST' });
}
