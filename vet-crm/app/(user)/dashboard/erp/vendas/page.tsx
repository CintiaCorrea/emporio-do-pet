'use client';
// Vendas — a LISTA. Pedido direto da Cintia (05/09/2026): "EU PRECISO poder editar as vendas,
// EU PRECISO que as vendas fiquem em lista".
//
// Ate aqui a unica visao de vendas era o box estreito do lado direito do Ponto de venda: coluna
// de no maximo 340px, cortada nas 8 primeiras, sem numero da venda, sem data e sem como editar
// direto. Pra mandar valores pra cliente ela precisava abrir uma por uma.
//
// Aqui e uma tabela de largura inteira, com o numero e a data visiveis, e cada linha leva pra
// acao certa: EDITAR abre a venda no proprio formulario do Ponto de venda (?editar=), nao num
// box; RECEBER abre o detalhe pra baixar no caixa (?venda=).

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { useRolePreview } from '@/lib/ui/RolePreview';

const TEAL = '#009AAC';
const NAVY = '#014D5E';
const LINE = '#E8E2D6';
const SOFT = '#F0EBE0';
const INK = '#112';
const MUT = '#5C6B70';
const OK = '#1c7a52'; const OKB = '#E1F5EE';
const WARN = '#8a6400'; const WARNB = '#FBF3E3';

type Venda = {
  id: string; tutor: string; pet: string; valor: number; pago: number;
  status?: string; pagoTotal?: boolean; date: string; tutorId?: string;
  numeroVenda?: number | null; futura?: boolean;
};

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const hoje = () => new Date().toISOString().slice(0, 10);
const diaBR = (s: string) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }); };
// Primeiro dia do mes corrente — o padrao da tela, porque "mandar valores pra cliente" quase
// sempre e sobre o mes que esta correndo.
const inicioDoMes = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); };

const th: React.CSSProperties = { textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.3px', color: MUT, fontWeight: 500, padding: '9px 10px', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px', borderBottom: `1px solid ${SOFT}`, fontSize: 13, color: INK, verticalAlign: 'middle' };
const inp: React.CSSProperties = { padding: '8px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', background: '#fff', color: INK, boxSizing: 'border-box' };
const acao: React.CSSProperties = { border: `1px solid ${LINE}`, background: '#fff', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: INK, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' };

export default function VendasListaPage() {
  usePageTitle('Vendas', 'Todas as vendas em lista — editar, receber e conferir valores');
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === 'ADMIN';

  const [de, setDe] = useState(inicioDoMes());
  const [ate, setAte] = useState(hoje());
  const [soAbertas, setSoAbertas] = useState(false); // ignora o periodo e traz TUDO em aberto
  const [situacao, setSituacao] = useState<'TODAS' | 'NAO' | 'PAGO'>('TODAS');
  const [busca, setBusca] = useState('');
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = soAbertas ? '?abertas=true' : `?from=${de}&to=${ate}`;
      const r = await fetch(`/api/caixa/vendas${qs}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Não consegui carregar as vendas.');
      const d = await r.json();
      setVendas(Array.isArray(d) ? d : (d?.data || d?.vendas || []));
    } catch (e: any) {
      toast.error(e?.message || 'Não consegui carregar as vendas.');
    } finally { setCarregando(false); }
  }, [de, ate, soAbertas]);

  useEffect(() => { carregar(); }, [carregar]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return vendas
      // Atendimento de R$ 0 e agenda/clinico, nao e venda — mesma regra do Ponto de venda.
      .filter((v) => Number(v.valor) > 0)
      .filter((v) => situacao === 'TODAS' || (situacao === 'PAGO' ? v.pagoTotal : !v.pagoTotal))
      .filter((v) => !q || `${v.tutor} ${v.pet} ${v.numeroVenda ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [vendas, situacao, busca]);

  const somaTotal = useMemo(() => lista.reduce((s, v) => s + Number(v.valor || 0), 0), [lista]);
  const somaPago = useMemo(() => lista.reduce((s, v) => s + Number(v.pago || 0), 0), [lista]);
  const somaAberto = Math.max(0, somaTotal - somaPago);

  // Excluir: quem nao e ADM so consegue apagar venda sem nenhum recebimento. O backend decide de
  // verdade (appointments.service.remove) — aqui a gente so evita oferecer o que vai dar erro.
  async function excluir(v: Venda) {
    if (Number(v.pago || 0) > 0 && !isAdmin) {
      toast.error('Essa venda já tem recebimento. Apague o recebimento no Caixa ou peça a um administrador.');
      return;
    }
    if (!window.confirm(`Excluir a venda ${v.numeroVenda ? '#' + v.numeroVenda + ' ' : ''}de ${v.tutor}${v.pet ? ' · ' + v.pet : ''} (${brl(v.valor)})?\nNão dá pra desfazer.`)) return;
    setExcluindo(v.id);
    try {
      let r = await fetch(`/api/appointments/${v.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const e = await r.json().catch(() => ({} as any));
        const msg = String(e?.message || '');
        if (msg.startsWith('TEM_GRAVACAO') && isAdmin) {
          if (!window.confirm('Esse atendimento tem uma gravação de áudio salva. Excluir apaga a gravação junto. Apagar mesmo assim?')) { setExcluindo(null); return; }
          r = await fetch(`/api/appointments/${v.id}?force=true`, { method: 'DELETE' });
          if (!r.ok) { const e2 = await r.json().catch(() => ({} as any)); throw new Error(String(e2?.message || '').replace(/^[A-Z_]+:\s*/, '') || 'Não consegui excluir.'); }
        } else {
          throw new Error(msg.replace(/^[A-Z_]+:\s*/, '') || 'Não consegui excluir.');
        }
      }
      toast.success('Venda excluída.');
      carregar();
    } catch (e: any) { toast.error(e?.message || 'Não consegui excluir.'); } finally { setExcluindo(null); }
  }

  return (
    <div className="p-4 md:p-6" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* filtros */}
      <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 13, display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ opacity: soAbertas ? 0.45 : 1, pointerEvents: soAbertas ? 'none' : 'auto', display: 'flex', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: MUT, marginBottom: 4 }}>De</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: MUT, marginBottom: 4 }}>Até</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={inp} />
          </div>
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: MUT, cursor: 'pointer', paddingBottom: 9 }}>
          <input type="checkbox" checked={soAbertas} onChange={(e) => setSoAbertas(e.target.checked)} />
          Todas em aberto (qualquer data)
        </label>
        <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: `1px solid ${LINE}` }}>
          {(['TODAS', 'NAO', 'PAGO'] as const).map((t) => (
            <button key={t} onClick={() => setSituacao(t)} style={{ padding: '8px 13px', border: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit', background: situacao === t ? TEAL : '#fff', color: situacao === t ? '#fff' : INK }}>
              {t === 'TODAS' ? 'Todas' : t === 'NAO' ? 'Não pagas' : 'Pagas'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 190 }}>
          <label style={{ display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: MUT, marginBottom: 4 }}>Buscar</label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Cliente, pet ou número da venda" style={{ ...inp, width: '100%' }} />
        </div>
        <button onClick={carregar} style={{ ...acao, padding: '9px 14px' }}>🔄 Atualizar</button>
        <Link href="/dashboard/erp/ponto-de-venda" style={{ textDecoration: 'none', border: 'none', background: TEAL, color: '#fff', borderRadius: 9, padding: '9px 15px', fontSize: 13, fontWeight: 500 }}>➕ Nova venda</Link>
      </div>

      {/* totais do que esta na tela */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { rot: `${lista.length} venda(s)`, val: brl(somaTotal), bg: '#fff', cor: NAVY, borda: LINE },
          { rot: 'Recebido', val: brl(somaPago), bg: OKB, cor: OK, borda: OKB },
          { rot: 'Em aberto', val: brl(somaAberto), bg: WARNB, cor: WARN, borda: WARNB },
        ].map((c) => (
          <div key={c.rot} style={{ flex: '1 1 170px', background: c.bg, border: `1px solid ${c.borda}`, borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ fontSize: 11.5, color: c.cor }}>{c.rot}</div>
            <div style={{ fontSize: 18, fontWeight: 500, color: c.cor, fontVariantNumeric: 'tabular-nums' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* a lista */}
      <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' }}>
        {carregando ? (
          <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: MUT }}>Carregando…</div>
        ) : lista.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>🧾</div>
            <div style={{ fontSize: 14, color: NAVY }}>Nenhuma venda com esses filtros.</div>
            <div style={{ fontSize: 12.5, color: MUT, marginTop: 3 }}>Tente alargar o período ou marcar “Todas em aberto”.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Nº</th>
                  <th style={th}>Data</th>
                  <th style={th}>Cliente</th>
                  <th style={th}>Pet</th>
                  <th style={{ ...th, textAlign: 'right' }}>Valor</th>
                  <th style={{ ...th, textAlign: 'right' }}>Recebido</th>
                  <th style={th}>Situação</th>
                  <th style={{ ...th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((v) => {
                  const emAberto = !v.pagoTotal;
                  const parcial = Number(v.pago || 0) > 0 && emAberto;
                  return (
                    <tr key={v.id}>
                      <td style={{ ...td, color: MUT, fontVariantNumeric: 'tabular-nums' }}>{v.numeroVenda ? `#${v.numeroVenda}` : '—'}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {diaBR(v.date)}
                        {v.futura && <span title="Venda com data pra frente" style={{ marginLeft: 5 }}>🗓️</span>}
                      </td>
                      <td style={{ ...td, fontWeight: 500, color: NAVY }}>{v.tutor}</td>
                      <td style={{ ...td, color: MUT }}>{v.pet || '—'}</td>
                      <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{brl(Number(v.valor || 0))}</td>
                      <td style={{ ...td, textAlign: 'right', color: Number(v.pago || 0) > 0 ? OK : MUT, fontVariantNumeric: 'tabular-nums' }}>{brl(Number(v.pago || 0))}</td>
                      <td style={td}>
                        <span style={{ background: emAberto ? WARNB : OKB, color: emAberto ? WARN : OK, fontSize: 11.5, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                          {emAberto ? (parcial ? 'Parcial' : 'Não paga') : 'Paga'}
                        </span>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Link href={`/dashboard/erp/ponto-de-venda?editar=${v.id}`} title="Abrir esta venda no formulário do Ponto de venda" style={{ ...acao, textDecoration: 'none', color: TEAL, borderColor: TEAL, display: 'inline-block' }}>✏️ Editar</Link>
                          {emAberto && (
                            <Link href={`/dashboard/erp/ponto-de-venda?venda=${v.id}`} title="Abrir para receber no caixa" style={{ ...acao, textDecoration: 'none', display: 'inline-block' }}>💰 Receber</Link>
                          )}
                          <button onClick={() => excluir(v)} disabled={excluindo === v.id} title="Excluir a venda" style={{ ...acao, color: '#b23b39', borderColor: '#F0D2D1' }}>
                            {excluindo === v.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
