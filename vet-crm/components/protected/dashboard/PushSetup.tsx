'use client';

/**
 * Ativa as notificações PUSH da equipe (aparecem mesmo com o sistema FECHADO).
 * Registra o service worker (/sw.js), pede permissão e inscreve o aparelho no
 * backend. Mostra um aviso discreto só quando a permissão ainda está "default".
 * Se já concedida, inscreve em silêncio. Se negada/sem suporte, some.
 */
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

const suportado = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export default function PushSetup() {
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [ativando, setAtivando] = useState(false);

  // Inscreve este aparelho (registra SW + assina o push + manda pro backend).
  const inscrever = useCallback(async (comTeste: boolean) => {
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
    if (comTeste) { await fetch('/api/push/test', { method: 'POST' }).catch(() => undefined); }
  }, []);

  useEffect(() => {
    if (!suportado()) return;
    const perm = Notification.permission;
    if (perm === 'granted') {
      // Já autorizado → garante a inscrição em silêncio (ex.: trocou de navegador).
      inscrever(false).catch(() => undefined);
    } else if (perm === 'default') {
      if (sessionStorage.getItem('push_banner_dispensado') !== '1') setMostrarBanner(true);
    }
  }, [inscrever]);

  const ativar = async () => {
    setAtivando(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        toast('Sem problema — você pode ativar depois.', { icon: '🔕' });
        setMostrarBanner(false);
        return;
      }
      await inscrever(true);
      toast.success('Avisos ativados! Você recebe mesmo com o sistema fechado. 🔔');
      setMostrarBanner(false);
    } catch {
      toast.error('Não consegui ativar os avisos neste aparelho.');
    } finally {
      setAtivando(false);
    }
  };

  const dispensar = () => { sessionStorage.setItem('push_banner_dispensado', '1'); setMostrarBanner(false); };

  if (!mostrarBanner) return null;

  return (
    <div className="no-print" style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 9998, width: 320, maxWidth: 'calc(100vw - 36px)', background: '#fff', border: '1px solid #E8DFC8', borderRadius: 16, boxShadow: '0 14px 40px rgba(1,30,36,.18)', overflow: 'hidden' }}>
      <div style={{ background: 'linear-gradient(135deg,#009AAC,#014D5E)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>🔔</span>
        <b style={{ fontSize: 14 }}>Ativar avisos fora do sistema</b>
      </div>
      <div style={{ padding: '14px 16px' }}>
        <p style={{ fontSize: 13, color: '#3A4A4E', lineHeight: 1.5, margin: 0 }}>
          Receba recados e transferências de conversa <b>mesmo com o sistema fechado</b>, como uma notificação do celular/computador.
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={dispensar} style={{ border: '1px solid #E8DFC8', background: '#fff', color: '#5C6B70', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, cursor: 'pointer' }}>Agora não</button>
          <button onClick={ativar} disabled={ativando} style={{ border: 'none', background: '#009AAC', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', opacity: ativando ? 0.6 : 1 }}>{ativando ? 'Ativando…' : 'Ativar avisos'}</button>
        </div>
      </div>
    </div>
  );
}
