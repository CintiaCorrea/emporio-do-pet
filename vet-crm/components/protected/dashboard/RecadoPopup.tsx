'use client';

/**
 * RecadoPopup — popup que avisa quando a pessoa recebe:
 *   1) um RECADO interno; ou
 *   2) uma TRANSFERÊNCIA de conversa.
 *
 * SEGURANÇA (lição dos incidentes de 05/08 — ver memória recado-popup-desligado):
 *   NUNCA mostra backlog. Abordagem "seen-set": no PRIMEIRO carregamento, tudo que já
 *   está pendente é marcado como "já visto" (silenciado, sem popar). Só popa o que chega
 *   DEPOIS que a tela abriu (poll de 15s + tempo real). Sem corte por tempo (fuso/relógio).
 *   Além disso tem um "×" de escape — nada nunca prende a tela de vez.
 * Puramente frontend — o backend já cria a nota/notificação (metadata.kind =
 * 'internal_note' | 'conversa_encaminhada').
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useNotifications } from '@/hooks/useNotifications';
import { isInternasAberta } from '@/lib/ui/inboxPresence';

type Item =
  | { tipo: 'recado'; id: string; nome: string; texto: string; conversationId?: string | null; fromUserId?: string; createdAt: string }
  | { tipo: 'transferencia'; id: string; texto: string; link: string; createdAt: string };

const POLL_MS = 15000;
const KINDS = ['internal_note', 'conversa_encaminhada', 'nps_detrator'];

export default function RecadoPopup() {
  const { data: session } = useSession();
  const meId = (session as any)?.user?.id as string | undefined;
  const router = useRouter();
  const [fila, setFila] = useState<Item[]>([]);
  const [saindo, setSaindo] = useState(false);
  const [resposta, setResposta] = useState('');   // resposta rápida na própria caixinha
  const [enviando, setEnviando] = useState(false);

  // "seen-set": ids que NÃO devem popar. No 1º carregamento tudo que já está pendente
  // entra aqui (silencia o backlog). Depois, qualquer id fora do set = aviso NOVO → popa.
  const seen = useRef<Set<string>>(new Set());
  const baseline = useRef(false);

  // #9 — sincroniza a baixa entre ABAS: quando um aviso é resolvido numa aba, avisa as
  // outras pra tirarem da fila também (senão continua popando nas abas que já estavam abertas).
  const bc = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('recado-popup');
    bc.current = ch;
    ch.onmessage = (ev) => {
      const id = (ev.data as any)?.id;
      if (id) { seen.current.add(id); setFila((f) => f.filter((x) => x.id !== id)); }
    };
    return () => { ch.close(); bc.current = null; };
  }, []);
  const avisarOutrasAbas = useCallback((id: string) => { try { bc.current?.postMessage({ id }); } catch { /* noop */ } }, []);

  const carregar = useCallback(async () => {
    if (!meId) return;
    try {
      const [rNotas, rNotifs] = await Promise.all([
        fetch('/api/internal-notes', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch('/api/notifications?limit=50', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] })),
      ]);

      const recados: Item[] = (rNotas || [])
        .filter((n: any) => n.toUserId === meId && n.fromUserId !== meId && !n.readAt)
        .map((n: any) => ({
          tipo: 'recado' as const,
          id: n.id,
          nome: n.fromUser?.name || 'Um colega',
          texto: n.content || '',
          conversationId: n.conversationId,
          fromUserId: n.fromUserId,
          createdAt: n.createdAt,
        }));

      const transfers: Item[] = ((rNotifs?.data) || [])
        .filter((n: any) => !(n.isRead ?? n.read) && (n.metadata as any)?.kind === 'conversa_encaminhada')
        .map((n: any) => ({
          tipo: 'transferencia' as const,
          id: n.id,
          texto: n.message || 'Você recebeu uma conversa.',
          link: n.link || ((n.metadata as any)?.conversationId ? `/dashboard/inbox-nativo?conversa=${(n.metadata as any).conversationId}` : '/dashboard/inbox-nativo'),
          createdAt: n.createdAt,
        }));

      const candidatos = [...recados, ...transfers];

      // 1º carregamento: silencia TUDO que já existe (nunca popa backlog).
      if (!baseline.current) {
        candidatos.forEach((c) => seen.current.add(c.id));
        baseline.current = true;
        return;
      }

      // #9 — RECONCILIA com a verdade do servidor: se um aviso já não vem mais como
      // "não-lido" (foi resolvido nesta OU em outra aba), tira ele da fila aqui também.
      // Cobre o caso do BroadcastChannel não chegar (aba em outro processo, etc.).
      const idsNaoLidos = new Set(candidatos.map((c) => c.id));
      setFila((prev) => (prev.some((p) => !idsNaoLidos.has(p.id)) ? prev.filter((p) => idsNaoLidos.has(p.id)) : prev));

      // Depois: só o que ainda não vimos = aviso novo.
      const novos = candidatos.filter((c) => !seen.current.has(c.id));
      if (novos.length === 0) return;
      novos.forEach((c) => seen.current.add(c.id)); // marca como visto (não repopa depois)
      // Se a aba "Internas" está aberta, NÃO popa recado (a pessoa já está lá vendo).
      const paraFila = novos.filter((n) => !(n.tipo === 'recado' && isInternasAberta()));
      if (paraFila.length === 0) return;
      setFila((prev) => {
        const jaNaFila = new Set(prev.map((p) => p.id));
        const add = paraFila.filter((n) => !jaNaFila.has(n.id));
        return [...prev, ...add].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
      });
    } catch {
      /* rede instável — tenta de novo no próximo ciclo */
    }
  }, [meId]);

  // Tempo real: recado OU transferência → recarrega na hora (MESMO caminho pros dois,
  // o que já funciona pro recado). Detecta o tipo por metadata.kind OU pelo título.
  useNotifications({
    onNotification: (n) => {
      const meta = (n?.metadata as any) || {};
      let kind = meta.kind;
      const titulo = n?.title || '';
      if (!kind) { // fallback: nem sempre o metadata vem no payload do socket
        if (titulo.startsWith('📨 Conversa encaminhada')) kind = 'conversa_encaminhada';
        else if (titulo.startsWith('💬 Mensagem interna')) kind = 'internal_note';
      }
      if (KINDS.includes(kind)) carregar();
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
    avisarOutrasAbas(item.id); // #9 — some das outras abas também
  }, [removerAtual, avisarOutrasAbas]);

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

  // Responder na PRÓPRIA caixinha: manda um recado de volta pra quem enviou.
  const responder = useCallback(async () => {
    if (!atual || atual.tipo !== 'recado' || enviando) return;
    const texto = resposta.trim();
    if (!texto) return;
    if (!atual.fromUserId) { toast.error('Não consegui identificar quem enviou — abra no interno pra responder.'); return; }
    setEnviando(true);
    try {
      const r = await fetch('/api/internal-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: atual.fromUserId, content: texto, conversationId: atual.conversationId || undefined }),
      });
      if (!r.ok) throw new Error();
      await marcarLido(atual);   // marca a original como lida e tira da fila
      setResposta('');
      toast.success('Resposta enviada. ✅');
    } catch { toast.error('Não consegui enviar a resposta.'); }
    finally { setEnviando(false); }
  }, [atual, resposta, enviando, marcarLido]);

  // Cada aviso começa com a caixinha de resposta limpa.
  useEffect(() => { setResposta(''); }, [atual?.id]);

  // Válvula de segurança: fecha o aviso SEM marcar lido (continua no sino/inbox).
  // Nunca deixa a tela presa — mesmo que algo dê errado, dá pra sair.
  const dispensar = useCallback(() => {
    if (!atual) return;
    removerAtual(atual.id); // já está no seen-set, não volta a popar
    avisarOutrasAbas(atual.id); // #9 — fecha nas outras abas também
  }, [atual, removerAtual, avisarOutrasAbas]);

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
    >
      <div style={{ width: '100%', maxWidth: 400, background: '#fff', borderRadius: 18, boxShadow: '0 24px 60px rgba(0,0,0,.35)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg,#009AAC,#014D5E)', color: '#fff', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{ehRecado ? '📩' : '📨'}</div>
          <div>
            <b style={{ fontSize: 15, display: 'block' }}>{ehRecado ? 'Você recebeu um recado' : 'Conversa encaminhada pra você'}</b>
            <span style={{ fontSize: 12, opacity: .85 }}>{ehRecado ? 'de um colega' : 'um colega te passou uma conversa'}</span>
          </div>
          <button onClick={dispensar} title="Fechar (fica no sino)" aria-label="Fechar" style={{ position: 'absolute', top: 10, right: 12, border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', width: 26, height: 26, borderRadius: 8, cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
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
          {ehRecado ? (
            <>
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); responder(); } }}
                placeholder="Escreva sua resposta aqui…"
                rows={2}
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E7E0D2', borderRadius: 11, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#222E30', resize: 'vertical', outline: 'none' }}
              />
              <button onClick={responder} disabled={enviando || !resposta.trim()} style={{ border: 'none', borderRadius: 11, padding: 13, fontSize: 15, fontWeight: 600, cursor: 'pointer', background: '#009AAC', color: '#fff', opacity: (enviando || !resposta.trim()) ? .6 : 1 }}>
                {enviando ? 'Enviando…' : 'Enviar resposta'}
              </button>
              <button onClick={abrir} disabled={saindo} style={{ border: '1px solid #E7E0D2', borderRadius: 11, padding: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#5B6A6E' }}>
                {saindo ? 'Abrindo…' : 'Abrir no interno →'}
              </button>
            </>
          ) : (
            <>
              <button onClick={abrir} disabled={saindo} style={{ border: 'none', borderRadius: 11, padding: 13, fontSize: 15, fontWeight: 600, cursor: 'pointer', background: '#009AAC', color: '#fff', opacity: saindo ? .6 : 1 }}>
                {saindo ? 'Abrindo…' : 'Abrir conversa →'}
              </button>
              <button onClick={ciente} disabled={saindo} style={{ border: '1px solid #E7E0D2', borderRadius: 11, padding: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: 'transparent', color: '#5B6A6E' }}>
                Ok, ciente
              </button>
            </>
          )}
          {restantes > 0 && (
            <div style={{ textAlign: 'center', fontSize: 12, color: '#5B6A6E', marginTop: 2 }}>＋ mais {restantes} aviso{restantes > 1 ? 's' : ''} esperando</div>
          )}
        </div>
      </div>
    </div>
  );
}
