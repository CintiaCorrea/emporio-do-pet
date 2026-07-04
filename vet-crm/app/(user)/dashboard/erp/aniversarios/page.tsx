// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/aniversarios/page.tsx
// Aniversarios no padrao Base44 "delicada": lista de clientes e pets que
// fazem aniversario no mes, agrupada por dia, com WhatsApp e ficha.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { openWhatsAppMeta } from '@/lib/actions/whatsapp';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const ORANGE = '#D85A30';    // coral
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua (destaque)
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

type Tipo = 'CLIENTE' | 'PET';
interface Item {
  tipo: Tipo;
  id: string;
  nome: string;
  dia: number;
  birthDate?: string | null;
  idade?: number | null;
  tutorId?: string | null;
  tutorNome?: string | null;
  especie?: string | null;
  telefone?: string | null;
}
interface Resposta {
  month: number;
  total: number;
  clientes: number;
  pets: number;
  itens: Item[];
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const especieEmoji = (esp?: string | null) => {
  const s = String(esp || '').toUpperCase();
  if (s.includes('FELINE') || s.includes('GAT')) return '🐱';
  if (s.includes('CANINE') || s.includes('CACH') || s.includes('CÃO') || s.includes('CAO')) return '🐶';
  return '🐾';
};

const iniciais = (nome: string) => {
  const parts = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

type Filtro = 'TODOS' | 'CLIENTE' | 'PET';

export default function AniversariosPage() {
  usePageTitle('Aniversários', 'Clientes e pets que fazem aniversário');

  const hoje = new Date();
  const [month, setMonth] = useState(hoje.getMonth() + 1); // 1..12
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const ehMesAtual = month === hoje.getMonth() + 1;
  const diaHoje = hoje.getDate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/aniversarios?month=${month}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar aniversários');
      const d: Resposta = await r.json();
      setData(d);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar aniversários');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mudarMes = (delta: number) => setMonth((m) => ((m - 1 + delta + 12) % 12) + 1);

  const itensFiltrados = useMemo(() => {
    const itens = data?.itens || [];
    if (filtro === 'TODOS') return itens;
    return itens.filter((i) => i.tipo === filtro);
  }, [data, filtro]);

  // agrupa por dia (ordenado)
  const grupos = useMemo(() => {
    const map = new Map<number, Item[]>();
    itensFiltrados.forEach((it) => {
      const arr = map.get(it.dia) || [];
      arr.push(it);
      map.set(it.dia, arr);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dia, itens]) => ({ dia, itens: itens.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) }));
  }, [itensFiltrados]);

  const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: '14px 16px' };

  const kpi = (emoji: string, label: string, valor: number) => (
    <div style={{ ...cardStyle, flex: '1 1 150px', minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: TXT2, fontSize: 12.5, fontWeight: 500 }}>
        <span style={{ fontSize: 16 }}>{emoji}</span>{label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: TEAL_DARK, marginTop: 4 }}>{valor}</div>
    </div>
  );

  const chip = (id: Filtro, label: string) => {
    const on = filtro === id;
    return (
      <button
        onClick={() => setFiltro(id)}
        style={{
          fontSize: 12.5, fontWeight: 500, padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
          border: on ? `1.5px solid ${TEAL}` : `1px solid ${LINE}`,
          background: on ? TINT : '#fff', color: on ? TEAL_DARK : TXT2,
        }}
      >{label}</button>
    );
  };

  return (
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', padding: '20px 26px 60px', boxSizing: 'border-box' }}>

        {/* Titulo local (alem do cabecalho global) */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span>🎂</span> Aniversários
          </h1>
          <p style={{ fontSize: 13.5, color: TXT2, margin: '4px 0 0' }}>Clientes e pets que fazem aniversário</p>
        </div>

        {/* Seletor de mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
            <button onClick={() => mudarMes(-1)} style={{ border: 'none', background: '#fff', padding: '6px 14px', color: TEAL_DARK, cursor: 'pointer', fontSize: 18, lineHeight: 1 }} aria-label="Mês anterior">‹</button>
            <span style={{ fontSize: 13.5, fontWeight: 500, padding: '0 14px', color: TXT, minWidth: 100, textAlign: 'center' }}>{MESES[month - 1]}</span>
            <button onClick={() => mudarMes(1)} style={{ border: 'none', background: '#fff', padding: '6px 14px', color: TEAL_DARK, cursor: 'pointer', fontSize: 18, lineHeight: 1 }} aria-label="Próximo mês">›</button>
          </div>
          {!ehMesAtual && (
            <button onClick={() => setMonth(hoje.getMonth() + 1)} style={{ background: '#fff', color: TEAL_DARK, border: `1px solid ${LINE}`, fontSize: 12.5, fontWeight: 500, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>Este mês</button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {kpi('🎂', 'Total do mês', data?.total || 0)}
          {kpi('👤', 'Clientes', data?.clientes || 0)}
          {kpi('🐾', 'Pets', data?.pets || 0)}
        </div>

        {/* Chips de filtro */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {chip('TODOS', 'Todos')}
          {chip('CLIENTE', '👤 Clientes')}
          {chip('PET', '🐾 Pets')}
        </div>

        {loading && <p style={{ color: TXT2 }}>Carregando…</p>}

        {!loading && grupos.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 44 }}>
            <div style={{ fontSize: 34 }}>🎈</div>
            <p style={{ color: TXT2, margin: '10px 0 0' }}>Nenhum aniversariante neste mês.</p>
            <p style={{ color: TXT3, fontSize: 13, margin: '4px 0 0' }}>Navegue pelos meses para ver as datas.</p>
          </div>
        )}

        {!loading && grupos.map(({ dia, itens }) => {
          const ehHoje = ehMesAtual && dia === diaHoje;
          return (
            <div key={dia} style={{ marginBottom: 18 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9, marginBottom: 8,
                background: ehHoje ? TINT : SOFT, border: `1px solid ${ehHoje ? TEAL : DIV}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: TEAL_DARK }}>Dia {dia}</span>
                {ehHoje && <span style={{ fontSize: 11, fontWeight: 500, color: '#fff', background: TEAL, padding: '2px 9px', borderRadius: 20 }}>Hoje 🎉</span>}
                <span style={{ fontSize: 12, color: TXT3, marginLeft: 'auto' }}>{itens.length} {itens.length === 1 ? 'aniversariante' : 'aniversariantes'}</span>
              </div>

              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                {itens.map((it, i) => {
                  const ehPet = it.tipo === 'PET';
                  const fichaHref = ehPet ? `/dashboard/erp/pets/${it.id}` : `/dashboard/erp/tutores/${it.id}`;
                  return (
                    <div key={`${it.tipo}-${it.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px',
                      borderTop: i === 0 ? 'none' : `1px solid ${DIV}`,
                    }}>
                      {/* avatar */}
                      {ehPet ? (
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: SOFT, border: `1px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flex: '0 0 auto' }}>
                          {especieEmoji(it.especie)}
                        </div>
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: TINT, color: TEAL_DARK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, flex: '0 0 auto' }}>
                          {iniciais(it.nome)}
                        </div>
                      )}

                      {/* dados */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: TXT, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {it.nome}
                          {ehPet && it.tutorNome && <span style={{ color: TXT3, fontWeight: 400 }}> · tutor: {it.tutorNome}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: TXT2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: ehPet ? TXT2 : TEAL_DARK, background: ehPet ? DIV : TINT, padding: '1px 8px', borderRadius: 20 }}>
                            {ehPet ? '🐾 Pet' : '👤 Cliente'}
                          </span>
                          {it.idade != null && <span>faz {it.idade} {it.idade === 1 ? 'ano' : 'anos'}</span>}
                        </div>
                      </div>

                      {/* acoes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                        {it.telefone && (
                          <button
                            onClick={() => openWhatsAppMeta(it.telefone)}
                            title="Enviar WhatsApp"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${GREEN}`, background: '#fff', color: GREEN }}
                          >
                            <span>📲</span> WhatsApp
                          </button>
                        )}
                        <Link
                          href={fichaHref}
                          title="Ver ficha"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '7px 11px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TEAL_DARK, textDecoration: 'none' }}
                        >
                          <span>🔗</span> Ver ficha
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}
