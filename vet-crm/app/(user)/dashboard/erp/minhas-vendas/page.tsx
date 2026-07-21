// DESTINO: vet-crm/app/(user)/dashboard/erp/minhas-vendas/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import {
  LuChevronLeft, LuChevronRight, LuTrendingUp, LuShoppingBag, LuReceipt, LuTrophy, LuRefreshCw,
} from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const TEAL_SOFT = '#ECF8FA';
const GREEN = '#0f6e56';
const ORANGE = '#D85A30';
const LINE = '#E8E2D6';
const LINE2 = '#E8E2D6';

const AV = [
  { bg: '#E6F1FB', fg: '#185fa5' }, { bg: '#FBEAF0', fg: '#993556' },
  { bg: '#EEF6E2', fg: '#639922' }, { bg: '#FAEEDA', fg: '#854f0b' },
  { bg: '#EEEDFE', fg: '#534ab7' }, { bg: '#FAECE7', fg: '#993c1d' },
];
const GRUPO_COR = ['#009AAC', '#D85A30', '#639922', '#185fa5', '#534ab7', '#993556', '#854f0b'];

interface UserLite { id: string; name: string; role: string }
interface Grupo { grupo: string; valor: number }
interface VendaItem { id: string; numeroVenda: number | null; tutor: string; pet: string; valor: number; date: string; status: string }
interface RankItem { userId: string; name: string; role: string; total: number; num: number }
interface Prod {
  isAdmin: boolean; user: UserLite | null; total: number; num: number; ticket: number;
  porGrupo: Grupo[]; lista: VendaItem[]; usuarios?: UserLite[]; ranking?: RankItem[];
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const iniciais = (n: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const avatarOf = (n: string) => AV[(n || '').length % AV.length];
const roleLabel = (r: string) => r === 'ADMIN' ? 'Administrador' : r === 'VETERINARIAN' ? 'Veterinário(a)' : r === 'RECEPTIONIST' ? 'Recepção' : (r || '');
const dm = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const vendaNum = (n: number | null) => (n != null ? `#${n}` : '');
const iso = (d: Date) => d.toISOString().slice(0, 10);
function mondayOf(d: Date) { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); x.setHours(0, 0, 0, 0); return x; }
const inp: React.CSSProperties = { padding: '9px 10px', border: `1px solid ${LINE2}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff' };

export default function MinhasVendasPage() {
  usePageTitle('Minhas vendas', 'Sua produtividade no período');

  const [periodo, setPeriodo] = useState<'SEMANA' | 'MES'>('SEMANA');
  const [ref, setRef] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const [userId, setUserId] = useState('');
  const [prod, setProd] = useState<Prod | null>(null);
  const [loading, setLoading] = useState(true);

  const { from, to, label } = useMemo(() => {
    if (periodo === 'MES') {
      const ini = new Date(ref.getFullYear(), ref.getMonth(), 1);
      const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
      return { from: iso(ini), to: iso(fim), label: ini.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) };
    }
    const ini = mondayOf(ref);
    const fim = new Date(ini); fim.setDate(fim.getDate() + 6);
    return { from: iso(ini), to: iso(fim), label: `${dm(ini)} – ${dm(fim)}` };
  }, [periodo, ref]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/caixa/produtividade?from=${from}&to=${to}${userId ? '&userId=' + userId : ''}`, { cache: 'no-store' });
      if (r.ok) setProd(await r.json());
    } catch { /* */ } finally { setLoading(false); }
  }, [from, to, userId]);

  useEffect(() => { load(); }, [load]);

  const shift = (n: number) => setRef((d) => {
    const x = new Date(d);
    if (periodo === 'MES') x.setMonth(x.getMonth() + n);
    else x.setDate(x.getDate() + n * 7);
    return x;
  });

  const total = prod?.total || 0;
  const maxGrupo = Math.max(1, ...(prod?.porGrupo || []).map((g) => g.valor));

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden' };
  const metric = (lbl: string, value: string, Icon: any, color: string, bg: string) => (
    <div style={{ flex: 1, minWidth: 150, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 42, height: 42, borderRadius: 12, background: bg, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={21} /></span>
      <div><div style={{ fontSize: 12, color: '#5C6B70' }}>{lbl}</div><div style={{ fontSize: 20, fontWeight: 700, color: TEAL_DARK }}>{value}</div></div>
    </div>
  );

  return (
    <div style={{ width: '100%', background: '#F6F2EA', minHeight: '100%' }}>
      <style>{`@media print{ .no-print{display:none!important;} body{background:#fff;} }`}</style>
      <div style={{ width: '100%', padding: '18px 24px 60px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* controles */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: `1px solid ${LINE2}`, borderRadius: 9, overflow: 'hidden' }}>
            {(['SEMANA', 'MES'] as const).map((p) => (
              <button key={p} onClick={() => setPeriodo(p)} style={{ padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', background: periodo === p ? TEAL : '#fff', color: periodo === p ? '#fff' : '#5C6B70' }}>{p === 'SEMANA' ? 'Semana' : 'Mês'}</button>
            ))}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: '4px 6px' }}>
            <button onClick={() => shift(-1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: TEAL, padding: 6, display: 'inline-flex' }} aria-label="Anterior"><LuChevronLeft size={18} /></button>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1F2A2E', minWidth: 150, textAlign: 'center', textTransform: 'capitalize' }}>{label}</span>
            <button onClick={() => shift(1)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: TEAL, padding: 6, display: 'inline-flex' }} aria-label="Próximo"><LuChevronRight size={18} /></button>
          </div>
          {prod?.isAdmin && (
            <select value={userId} onChange={(e) => setUserId(e.target.value)} style={{ ...inp, minWidth: 180 }}>
              <option value="">Minha produtividade</option>
              {(prod.usuarios || []).map((u) => <option key={u.id} value={u.id}>{u.name} · {roleLabel(u.role)}</option>)}
            </select>
          )}
          <button onClick={load} style={{ marginLeft: 'auto', border: 'none', background: 'none', cursor: 'pointer', color: TEAL, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}><LuRefreshCw size={15} /> atualizar</button>
          <button onClick={() => window.print()} style={{ border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', color: TEAL_DARK, borderRadius: 9, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500 }}>🖨️ Imprimir</button>
        </div>

        {/* cabeçalho pessoa */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 13, padding: 16 }}>
          <span style={{ width: 46, height: 46, borderRadius: '50%', background: TEAL, color: '#fff', fontWeight: 600, fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(prod?.user?.name || '?')}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1F2A2E' }}>{prod?.user?.name || 'Você'}</div>
            <div style={{ fontSize: 12.5, color: '#5f8a93' }}>{roleLabel(prod?.user?.role || '')} · {periodo === 'MES' ? 'mês' : 'semana'} {label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: TEAL_DARK }}>{brl(total)}</div>
            <div style={{ fontSize: 11.5, color: '#374151' }}>total vendido</div>
          </div>
        </div>

        {/* métricas */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {metric('Total vendido', brl(total), LuTrendingUp, GREEN, '#E1F5EE')}
          {metric('Nº de vendas', String(prod?.num || 0), LuShoppingBag, '#185fa5', '#E6F1FB')}
          {metric('Ticket médio', brl(prod?.ticket || 0), LuReceipt, ORANGE, '#FAECE7')}
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* por tipo de serviço */}
          <div style={{ flex: '1.4 1 380px', minWidth: 0, ...card }}>
            <div style={{ background: '#FBF9F4', padding: '12px 16px', color: TEAL_DARK, fontSize: 13.5, fontWeight: 500, borderBottom: '1px solid #F0EBE0' }}>Vendas por tipo de serviço</div>
            <div style={{ padding: 16 }}>
              {(!prod?.porGrupo || prod.porGrupo.length === 0) && <p style={{ fontSize: 12.5, color: '#374151', textAlign: 'center', margin: '6px 0' }}>Sem itens classificados neste período.</p>}
              {(prod?.porGrupo || []).map((g, i) => (
                <div key={g.grupo} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                    <span style={{ color: '#1F2A2E' }}>{g.grupo}</span><span style={{ fontWeight: 600, color: TEAL_DARK }}>{brl(g.valor)}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: '#F0EBE0', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(3, (g.valor / maxGrupo) * 100)}%`, height: '100%', borderRadius: 6, background: GRUPO_COR[i % GRUPO_COR.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* direita */}
          <div style={{ flex: '1 1 280px', minWidth: 240, maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {prod?.isAdmin && (
              <div style={card}>
                <div style={{ background: '#FBF9F4', padding: '12px 16px', color: TEAL_DARK, fontSize: 13.5, fontWeight: 500, borderBottom: '1px solid #F0EBE0', display: 'inline-flex', alignItems: 'center', gap: 8, width: '100%', boxSizing: 'border-box' }}><LuTrophy size={16} color="#C08B2E" /> Ranking do período</div>
                <div style={{ padding: 12 }}>
                  {(!prod.ranking || prod.ranking.length === 0) && <p style={{ fontSize: 12, color: '#374151', textAlign: 'center', margin: '8px 0' }}>Sem vendas no período.</p>}
                  {(prod.ranking || []).map((r, i) => (
                    <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid #F0EBE0' : 'none' }}>
                      <span style={{ width: 22, fontSize: 12.5, fontWeight: 700, color: i === 0 ? '#BA7517' : '#374151', textAlign: 'center' }}>{i + 1}º</span>
                      <span style={{ width: 30, height: 30, borderRadius: '50%', background: avatarOf(r.name).bg, color: avatarOf(r.name).fg, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciais(r.name)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#374151' }}>{r.num} venda(s)</div>
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: TEAL_DARK }}>{brl(r.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={card}>
              <div style={{ background: '#FBF9F4', padding: '12px 16px', color: TEAL_DARK, fontSize: 13.5, fontWeight: 500, borderBottom: '1px solid #F0EBE0' }}>Vendas do período ({prod?.lista?.length || 0})</div>
              <div style={{ padding: 12, maxHeight: 420, overflowY: 'auto' }}>
                {loading && <p style={{ fontSize: 12, color: '#374151', textAlign: 'center', margin: '10px 0' }}>Carregando…</p>}
                {!loading && (!prod?.lista || prod.lista.length === 0) && <p style={{ fontSize: 12, color: '#374151', textAlign: 'center', margin: '10px 0' }}>Nenhuma venda no período.</p>}
                {(prod?.lista || []).map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? '1px solid #F0EBE0' : 'none' }}>
                    <span style={{ width: 30, height: 30, borderRadius: '50%', background: avatarOf(v.tutor).bg, color: avatarOf(v.tutor).fg, fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciais(v.tutor)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.tutor || 'Cliente'}</div>
                      <div style={{ fontSize: 11, color: '#374151' }}>{v.numeroVenda != null && <b style={{ color: TEAL_DARK, fontWeight: 500 }}>{vendaNum(v.numeroVenda)} · </b>}{v.pet} · {new Date(v.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: TEAL_DARK }}>{brl(v.valor)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: TEAL_SOFT, border: `1px solid #d4eef2`, borderRadius: 14, padding: 13, fontSize: 11.5, color: '#5f8a93', textAlign: 'center' }}>
              As metas (semanais e mensais) entram em breve, conectadas à configuração de metas da clínica.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
