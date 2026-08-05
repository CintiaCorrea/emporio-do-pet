'use client';

/**
 * RecadoPopup — popup GLOBAL que avisa, travando a tela, quando a pessoa recebe:
 *   1) um RECADO interno (só sai clicando "Responder"); ou
 *   2) uma TRANSFERÊNCIA de conversa (informativo: "Abrir conversa" ou "Ok, ciente").
 * Decisão da Cintia 05/08. Persiste enquanto não-lido (volta a cada carregamento,
 * mesmo se fechou o navegador). Puramente frontend — o backend já cria a nota/
 * notificação em tempo real (metadata.kind = 'internal_note' | 'conversa_encaminhada').
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/hooks/useNotifications';

type Item =
  | { tipo: 'recado'; id: string; nome: string; texto: string; conversationId?: string | null; createdAt: string }
  | { tipo: 'transferencia'; id: string; texto: string; link: string; createdAt: string };

const POLL_MS = 15000;
const KINDS = ['internal_note', 'conversa_encaminhada'];

export default function RecadoPopup() {
  const { data: session } = useSession();
  const meId = (session as any)?.user?.id as string | undefined;
  const router = useRouter();
  const [fila, setFila] = useState<Item[]>([]);
  const [saindo, setSaindo] = useState(false);
  // Só avisos NOVOS: nada criado antes de a tela abrir (com 2 min de graça pra pegar
  // o que chegou logo antes do login). Evita ressurgir o histórico já resolvido.
  const desdeRef = useRef<number>(Date.now() - 2 * 60 * 1000);
  const novo = (createdAt: string) => { const t = new Date(createdAt).getTime(); return Number.isFinite(t) && t > desdeRef.current; };

  const carregar = useCallback(async () => {
    if (!meId) return;
    try {
      const [rNotas, rNotifs] = await Promise.all([
        fetch('/api/internal-notes', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/notifications?limit=50', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      ]);

      const recados: Item[] = (rNotas || [])
        .filter((n: any) => n.toUserId === meId && n.fromUserId !== meId && !n.readAt && novo(n.createdAt))
        .map((n: any) => ({
          tipo: 'recado' as const,
          id: n.id,
          nome: n.fromUser?.name || 'Um colega',
          texto: n.content || '',
          conversationId: n.conversationId,
          createdAt: n.createdAt,
        }));

      const transfers: Item[] = ((rNotifs?.data) || [])
        .filter((n: any) => !n.read && (n.metadata as any)?.kind === 'conversa_encaminhada' && novo(n.createdAt))
        .map((n: any) => ({
          tipo: 'transferencia' as const,
          id: n.id,
          texto: n.message || 'Você recebeu uma conversa.',
          link: n.link || (( n.metadata as any)?.conversationId ? `/dashboard/inbox-nativo?conversa=${(n.metadata as any).conversationId}` : '/dashboard/inbox-nativo'),
          createdAt: n.createdAt,
        }));

      const todos = [...recados, ...transfers].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      setFila(todos);
    } catch {
      /* rede instável — tenta de novo no próximo ciclo */
    }
  }, [meId]);

  // Tempo real: recado OU transferência → recarrega na hora.
  useNotifications({
    onNotification: (n) => {
      if (KINDS.includes((n?.metadata as any)?.kind)) carregar();
    },
  });

  useEffect(() => {
    carregar();
    const t = setInterval(carregar, POLL_MS);
    return () => clearInterval(t);
  }, [carregar]);

  const atual = fila[0];

  useEffect(() => {
    if (atual) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [atual]);

  const removerAtual = useCallback((id: string) => setFila((f) => f.filter((x) => x.id !== id)), []);

  // marca lido no lugar certo (nota interna vs notificação) e some da fila
  const marcarLido = useCallback(async (item: Item) => {
    const url = item.tipo === 'recado'
      ? `/api/internal-notes/${item.id}/read`
      : `/api/notifications/${item.id}/read`;
    try { await fetch(url, { method: 'PATCH' }); } catch { /* segue mesmo assim */ }
    removerAtual(item.id);
  }, [removerAtual]);

  const abrir = useCallback(async () => {
    if (!atual || saindo) return;
    setSaindo(true);
    await marcarLido(atual);
    const link = atual.tipo === 'recado'
      ? (atual.conversationId ? `/dashboard/inbox-nativo?conversa=${atual.conversationId}` : '/dashboard/inbox-nativo')
      : atual.link;
    router.push(link);
    setSaindo(false);
  }, [atual, saindo, marcarLido, router]);

  const ciente = useCallback(async () => {
    if (!atual || saindo) return;
    setSaindo(true);
    await marcarLido(atual);
    setSaindo(false);
  }, [atual, saindo, marcarLido]);

  if (!atual) return null;

  const ehRecado = atual.tipo === 'recado';
  const iniciais = ehRecado
    ? ((atual as any).nome.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('') || '?')
    : '';
  const quando = (() => {
    try { return new Date(atual.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  })();
  const restantes = fila.length - 1;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(1,30,36,.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onKeyDown={(e) => { if (e.key === 'Escape') e.preventDefault(); }}
    >
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,.35)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#009AAC,#014D5E)', color: '#fff', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{ehRecado ? '📩' : '📨'}</div>
          <div>
            <b style={{ fontSize: 15, display: 'block' }}>{ehRecado ? 'Você recebeu um recado' : 'Conversa encaminhada pra você'}</b>
            <span style={{ fontSize: 12, opacity: .85 }}>{ehRecado ? 'fica aqui até você responder' : 'um colega te passou uma conversa'}</span>
          </div>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {ehRecado && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#7A5A9E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>{iniciais}</div>
              <div><b style={{ fontSize: 14, color: '#222E30' }}>{(atual as any).nome}</b>{quando && <div style={{ fontSize: 12, color: '#5B6A6E' }}>{quando}</div>}</div>
            </div>
          )}
          <div style={{ background: '#F4EFE6', border: '1px solid #E7E0D2', borderRadius: 12, padding: '12px 14px', fontSize: 14, color: '#222E30', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 220, overflowY: 'auto' }}>
            {atual.texto}
          </div>
        </div>
        <div style={{ padding: '0 20px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button onClick={abrir} disabled={saindo} style={{ border: 'none', borderRadius: 11, padding: 13, fontSize: 15, fontWeight: 600, cursor: 'pointer', background: '#009AAC', color: '#fff', opacity: saindo ? .6 : 1 }}>
            {saindo ? 'Abrindo…' : (ehRecado ? 'Responder agora →' : 'Abrir conversa →')}
          </button>
          {ehRecado ? (
            <div style={{ textAlign: 'center', fontSize: 11.5, color: '#5B6A6E' }}>Este aviso só sai da tela quando você abrir para responder.</div>
          ) : (
            <button onClick={ciente} disabled={saindo} style={{ border: '1px solid #E7E0D2', borderRadius: 11, padding: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#5B6A6E' }}>
              Ok, ciente
            </button>
          )}
          {restantes > 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#5B6A6E', marginTop: 2 }}>＋ mais {restantes} aviso{restantes > 1 ? 's' : ''} esperando</div>
          )}
        </div>
      </div>
    </div>
  );
}
