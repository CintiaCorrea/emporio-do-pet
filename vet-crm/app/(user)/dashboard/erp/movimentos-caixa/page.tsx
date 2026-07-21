// DESTINO: vet-crm/app/(user)/dashboard/erp/movimentos-caixa/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { LuEye, LuEyeOff } from 'react-icons/lu';

const TEAL_DARK = '#014D5E';
const GREEN = '#0f6e56';
const ORANGE = '#D85A30';
const LINE = '#E8E2D6';

interface Mov { id: string; tipo: string; valor: number; forma?: string | null; conta?: string | null; descricao?: string | null; data: string; }

const tipoLabel: Record<string, string> = { SUPRIMENTO: 'Suprimento', SANGRIA: 'Sangria', DESPESA: 'Despesa', TRANSFERENCIA: 'Transferência' };
const ehEntrada = (t: string) => t === 'SUPRIMENTO';
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const dh = (s?: string | null) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const th: React.CSSProperties = { color: '#5C6B70', fontWeight: 500, padding: '9px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'left', fontSize: 12.5 };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #F0EBE0', fontSize: 13 };

export default function MovimentosPage() {
  usePageTitle('Movimentos de caixa', 'Suprimentos, sangrias, despesas e transferências');
  const hoje = new Date();
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [rows, setRows] = useState<Mov[]>([]);
  const [loading, setLoading] = useState(true);
  const [ocultar, setOcultar] = useState(false);
  const money = (v: number) => (ocultar ? 'R$ ••••' : brl(v));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/caixa/movimentos?from=${from}&to=${to}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar movimentos');
      setRows(await r.json());
    } catch (e: any) { toast.error(e.message || 'Erro'); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const tot = useMemo(() => {
    const ent = rows.filter((m) => ehEntrada(m.tipo)).reduce((s, m) => s + Number(m.valor || 0), 0);
    const sai = rows.filter((m) => !ehEntrada(m.tipo)).reduce((s, m) => s + Number(m.valor || 0), 0);
    return { ent, sai };
  }, [rows]);

  return (
    <div style={{ width: '100%', background: '#F6F2EA', minHeight: '100%' }}>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div><label style={lbl}>De</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Até</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} /></div>
          <button onClick={() => setOcultar((v) => !v)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #E8E2D6', background: '#fff', color: TEAL_DARK }}>
            {ocultar ? <LuEyeOff size={15} /> : <LuEye size={15} />}{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
          <button onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #E8E2D6', background: '#fff', color: TEAL_DARK }}>🖨️ Imprimir</button>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, padding: '12px 16px', borderBottom: `1px solid ${LINE}`, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{rows.length} movimento(s)</span>
            <span style={{ fontSize: 13, display: 'flex', gap: 16 }}>
              <span style={{ color: '#014D5E' }}>Entradas <b style={{ color: GREEN }}>{money(tot.ent)}</b></span>
              <span style={{ color: '#014D5E' }}>Saídas <b style={{ color: ORANGE }}>{money(tot.sai)}</b></span>
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Data</th><th style={th}>Tipo</th><th style={th}>Descrição</th><th style={th}>Conta</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#374151', padding: 18 }}>Carregando…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#374151', padding: 18 }}>Nenhum movimento no período.</td></tr>}
                {rows.map((m) => {
                  const ent = ehEntrada(m.tipo);
                  return (
                    <tr key={m.id}>
                      <td style={{ ...td, color: '#5C6B70' }}>{dh(m.data)}</td>
                      <td style={{ ...td, color: ent ? GREEN : ORANGE }}>{tipoLabel[m.tipo] || m.tipo}</td>
                      <td style={{ ...td, color: '#5C6B70' }}>{m.descricao || '—'}</td>
                      <td style={{ ...td, color: '#374151' }}>{m.conta || (m.forma || '—')}</td>
                      <td style={{ ...td, textAlign: 'right', fontWeight: 500, color: ent ? GREEN : ORANGE }}>{ent ? '' : '− '}{money(Number(m.valor))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: '9px 10px', border: '1px solid #E8E2D6', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#5C6B70', display: 'block', marginBottom: 5 };
