// DESTINO: vet-crm/app/(user)/dashboard/erp/lista-precos/page.tsx
// Roupagem Base44 "delicada" (bege + emojis) — LOGICA 100% preservada.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const BG = '#F6F2EA';        // fundo da pagina
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

interface Servico { id: string; nome: string; valorPadrao?: number | null; custoPadrao?: number | null; ativo: boolean; category?: { id: string; nome: string } | null; }

const brl = (v?: number | null) => (v == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v)));
const th: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '8px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const td: React.CSSProperties = { padding: '10px', borderBottom: `1px solid ${DIV}`, fontSize: 13 };

export default function ListaPrecosPage() {
  usePageTitle('Lista de preços', 'Tabela de serviços e valores');
  const [rows, setRows] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState('');
  const [ocultar, setOcultar] = useState(false);
  const money = (v?: number | null) => (ocultar ? 'R$ ••••' : brl(v));

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/servicos/itens', { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar serviços');
      setRows(await r.json());
    } catch (e: any) { toast.error(e.message || 'Erro'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const categorias = useMemo(() => {
    const set = new Map<string, string>();
    rows.forEach((s) => { if (s.category) set.set(s.category.id, s.category.nome); });
    return Array.from(set.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((s) =>
      (!cat || s.category?.id === cat) &&
      (!q || (s.nome || '').toLowerCase().includes(q)),
    );
  }, [rows, busca, cat]);

  return (
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
            <span style={{ position: 'absolute', left: 10, top: 8, fontSize: 14, color: TXT3, pointerEvents: 'none' }}>🔍</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar serviço…" style={{ ...inp, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }} />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} style={inp}>
            <option value="">Todas as categorias</option>
            {categorias.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select>
          <button onClick={() => setOcultar((v) => !v)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TEAL_DARK }}>
            <span style={{ fontSize: 14 }}>{ocultar ? '🙈' : '👁️'}</span>{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
        </div>

        <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${LINE}`, fontWeight: 500, fontSize: 14, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 15 }}>🏷️</span>{filtradas.length} serviço(s)</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Serviço</th><th style={th}>Categoria</th><th style={{ ...th, textAlign: 'right' }}>Custo</th><th style={{ ...th, textAlign: 'right' }}>Valor</th></tr></thead>
              <tbody>
                {loading && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: TXT3, padding: 18 }}>Carregando…</td></tr>}
                {!loading && filtradas.length === 0 && <tr><td colSpan={4} style={{ ...td, textAlign: 'center', color: TXT3, padding: 18 }}>Nenhum serviço encontrado.</td></tr>}
                {filtradas.map((s) => (
                  <tr key={s.id}>
                    <td style={{ ...td, color: TXT }}>{s.nome}{!s.ativo && <span style={{ fontSize: 10.5, color: TXT3, marginLeft: 6 }}>(inativo)</span>}</td>
                    <td style={{ ...td, color: TXT2 }}>{s.category?.nome || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: TXT3 }}>{s.custoPadrao != null ? money(s.custoPadrao) : '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 500, color: TEAL_DARK }}>{money(s.valorPadrao)}</td>
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
