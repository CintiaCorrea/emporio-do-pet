// DESTINO: vet-crm/app/(user)/dashboard/erp/saldo-clientes/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { LuEye, LuEyeOff, LuSearch } from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const GREEN = '#0f6e56';
const ORANGE = '#D85A30';
const LINE = '#E8E2D6';

interface Saldo { tutorId: string; nome: string; saldo: number }

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const th: React.CSSProperties = { color: '#5C6B70', fontWeight: 500, padding: '9px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'left', fontSize: 12.5 };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #F0EBE0', fontSize: 13 };

export default function SaldosPage() {
  usePageTitle('Saldo dos clientes', 'Crédito disponível por cliente');
  const [rows, setRows] = useState<Saldo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [ocultar, setOcultar] = useState(false);
  const money = (v: number) => (ocultar ? 'R$ ••••' : brl(v));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/credito/saldos', { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar saldos');
      setRows(await r.json());
    } catch (e: any) { toast.error(e.message || 'Erro'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? rows.filter((r) => (r.nome || '').toLowerCase().includes(q)) : rows;
  }, [rows, busca]);
  const total = useMemo(() => filtradas.reduce((s, r) => s + Number(r.saldo || 0), 0), [filtradas]);

  return (
    <div style={{ width: '100%', background: '#F6F2EA', minHeight: '100%' }}>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <LuSearch size={15} style={{ position: 'absolute', left: 10, top: 10, color: '#8A989D' }} />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente…" style={{ ...inp, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => setOcultar((v) => !v)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #E8E2D6', background: '#fff', color: TEAL_DARK }}>
            {ocultar ? <LuEyeOff size={15} /> : <LuEye size={15} />}{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
          <button onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #E8E2D6', background: '#fff', color: TEAL_DARK }}>🖨️ Imprimir</button>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${LINE}` }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{filtradas.length} cliente(s) com saldo</span>
            <span style={{ fontSize: 13, color: '#014D5E' }}>Total em crédito <b style={{ color: TEAL_DARK }}>{money(total)}</b></span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Cliente</th><th style={{ ...th, textAlign: 'right' }}>Saldo</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: '#8A989D', padding: 18 }}>Carregando…</td></tr>}
                {!loading && filtradas.length === 0 && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: '#8A989D', padding: 18 }}>Nenhum cliente com saldo.</td></tr>}
                {filtradas.map((r) => (
                  <tr key={r.tutorId}>
                    <td style={{ ...td, color: '#1F2A2E' }}>{r.nome}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 600, color: Number(r.saldo) < 0 ? ORANGE : GREEN }}>{money(Number(r.saldo))}</td>
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

const inp: React.CSSProperties = { padding: '9px 10px', border: '1px solid #E8E2D6', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
