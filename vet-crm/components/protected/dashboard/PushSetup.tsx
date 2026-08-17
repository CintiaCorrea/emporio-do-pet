'use client';

/**
 * Aviso discreto pra ATIVAR as notificações push (aparecem com o sistema fechado).
 * A lógica de verdade mora em lib/push/pushClient (compartilhada com a tela
 * Configurações › Notificações). Aqui é só o banner + inscrição silenciosa.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { pushSuportado, permissaoPush, inscreverAparelho, ativarPush, testarPush } from '@/lib/push/pushClient';

export default function PushSetup() {
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [ativando, setAtivando] = useState(false);

  useEffect(() => {
    if (!pushSuportado()) return;
    const perm = permissaoPush();
    if (perm === 'granted') {
      inscreverAparelho().catch(() => undefined); // já autorizado → garante a inscrição em silêncio
    } else if (perm === 'default') {
      if (sessionStorage.getItem('push_banner_dispensado') !== '1') setMostrarBanner(true);
    }
  }, []);

  const ativar = async () => {
    setAtivando(true);
    try {
      const perm = await ativarPush();
      if (perm !== 'granted') {
        toast('Sem problema — você pode ativar depois em Configurações › Notificações.', { icon: '🔕' });
        setMostrarBanner(false);
        return;
      }
      await testarPush();
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
