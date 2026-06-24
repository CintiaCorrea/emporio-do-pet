// DESTINO: vet-crm/app/(user)/dashboard/erp/recebimentos/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { LuEye, LuEyeOff } from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const LINE = '#e6eaed';

interface Forma { forma: string; valor: number }
interface Rec {
  id: string; valorTotal: number; desconto: number; troco: number; formas: Forma[]; data: string;
  appointment?: { value: number; pet?: { name: string } | null; tutor?: { name: string } | null } | null;
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const dh = (s?: string | null) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const th: React.CSSProperties = { color: '#64748b', fontWeight: 500, padding: '9px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'left', fontSize: 12.5 };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #f1f5f6', fontSize: 13 };

export default function RecebimentosPage() {
  usePageTitle('Recebimentos', 'Todos os recebimentos do caixa');
  const hoje = new Date();
  const ini = new Date(); ini.setDate(ini.getDate() - 30);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [rows, setRows] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [ocultar, setOcultar] = useState(false);
  const money = (v: number) => (ocultar ? 'R$ ••••' : brl(v));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/caixa/recebimentos?from=${from}&to=${to}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar recebimentos');
      setRows(await r.json());
    } catch (e: any) { toast.error(e.message || 'Erro'); } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.valorTotal || 0), 0), [rows]);

  return (
    <div style={{ width: '100%', background: '#f7f9fa', minHeight: '100%' }}>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div><label style={lbl}>De</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Até</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} /></div>
          <button onClick={() => setOcultar((v) => !v)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #d7e0e2', background: '#fff', color: TEAL_DARK }}>
            {ocultar ? <LuEyeOff size={15} /> : <LuEye size={15} />}{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${LINE}` }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{rows.length} recebimento(s)</span>
            <span style={{ fontSize: 13, color: '#0f6e7a' }}>Total <b style={{ color: TEAL_DARK }}>{money(total)}</b></span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Data</th><th style={th}>Cliente · Pet</th><th style={th}>Formas</th><th style={{ ...th, textAlign: 'right' }}>Desconto</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 18 }}>Carregando…</td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: '#94a3b8', padding: 18 }}>Nenhum recebimento no período.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...td, color: '#64748b' }}>{dh(r.data)}</td>
                    <td style={{ ...td, color: '#1f2d33' }}>{r.appointment?.tutor?.name || 'Cliente'} · {r.appointment?.pet?.name || 'Pet'}</td>
                    <td style={{ ...td, color: '#94a3b8' }}>{(r.formas || []).map((f) => f.forma).join(' + ') || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#94a3b8' }}>{r.desconto ? money(Number(r.desconto)) : '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>{money(Number(r.valorTotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { padding: '9px 10px', border: '1px solid #d7e0e2', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 12, color: '#475569', display: 'block', marginBottom: 5 };
