// DESTINO: vet-crm/app/(user)/dashboard/erp/saldo-clientes/page.tsx
// Roupagem repaginada — padrao Base44 delicada (bege + emojis). LOGICA 100% preservada.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

// Paleta Base44 delicada (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const GREEN = '#0f6e56';     // sucesso
const ORANGE = '#D85A30';    // coral
const BG = '#F6F2EA';        // fundo da pagina
const TINT = '#E0F4F6';      // agua (avatar)
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

interface Saldo { tutorId: string; nome: string; saldo: number }

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const th: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '9px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const td: React.CSSProperties = { padding: '10px', borderBottom: `1px solid ${DIV}`, fontSize: 13 };

// avatar de iniciais (bolinha agua)
const iniciais = (nome: string) => (nome || '').trim().split(/\s+/).slice(0, 2).map((p) => p[0] || '').join('').toUpperCase() || '?';

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
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 360 }}>
            <span style={{ position: 'absolute', left: 10, top: 8, fontSize: 14, color: TXT3 }}>🔍</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente…" style={{ ...inp, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
          </div>
          <button onClick={() => setOcultar((v) => !v)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TEAL_DARK }}>
            <span style={{ fontSize: 14 }}>{ocultar ? '🙈' : '👁️'}</span>{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${LINE}` }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 500, fontSize: 14, color: TEAL_DARK }}><span style={{ fontSize: 15 }}>📋</span>{filtradas.length} cliente(s) com saldo</span>
            <span style={{ fontSize: 13, color: TEAL_DARK, display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 14 }}>💰</span>Total em crédito <b style={{ color: TEAL_DARK, fontWeight: 500 }}>{money(total)}</b></span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Cliente</th><th style={{ ...th, textAlign: 'right' }}>Saldo</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: TXT3, padding: 18 }}>Carregando…</td></tr>}
                {!loading && filtradas.length === 0 && <tr><td colSpan={2} style={{ ...td, textAlign: 'center', color: TXT3, padding: 18 }}>Nenhum cliente com saldo.</td></tr>}
                {filtradas.map((r) => (
                  <tr key={r.tutorId}>
                    <td style={{ ...td, color: TXT }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 30, height: 30, borderRadius: 999, background: TINT, color: TEAL_DARK, fontSize: 11.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciais(r.nome)}</span>
                        {r.nome}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 500, color: Number(r.saldo) < 0 ? ORANGE : GREEN }}>{money(Number(r.saldo))}</td>
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

const inp: React.CSSProperties = { padding: '9px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff' };
