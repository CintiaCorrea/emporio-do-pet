// DESTINO: vet-crm/app/(user)/dashboard/erp/ponto-de-venda/page.tsx
'use client';
// [EMP-COWORK] Ponto de venda repaginado no padrão Base44 (header leve, emojis, bege, sem barras sólidas). Lógica preservada.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

const TEAL = '#009AAC';
const NAVY = '#014D5E';
const INK = '#1F2A2E';
const INK2 = '#5C6B70';
const MUT = '#8A989D';
const LINE = '#E8E2D6';
const SOFT = '#F0EBE0';
const AGUA = '#E0F4F6';
const SUAVE = '#FBF9F4';
const OK = '#0F6E56'; const OKB = '#E1F5EE';
const WARN = '#8a6400'; const WARNB = '#FBF3E3';
const ERR = '#b23b39'; const ERRB = '#FDECEC';

const AV = [
  { bg: '#E6F1FB', fg: '#185fa5' }, { bg: '#FBEAF0', fg: '#993556' },
  { bg: '#EEF6E2', fg: '#639922' }, { bg: '#FAEEDA', fg: '#854f0b' },
  { bg: '#EEEDFE', fg: '#534ab7' }, { bg: '#FAECE7', fg: '#993c1d' },
];

interface Pet { id: string; name: string }
interface Tutor { id: string; name: string; pets?: Pet[] }
interface Servico { id: string; nome: string; valorPadrao?: number | null }
interface Prof { id: string; name: string }
interface CartItem { servicoId?: string; descricao: string; quantidade: number; valorUnitario: number; desconto: number }
interface Forma { forma: string; valor: number }
interface Venda { id: string; tutor: string; pet: string; valor: number; pago: number; status: string; pagoTotal: boolean; date: string }

const FORMAS = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const TIPOS_VENDA = ['Presencial, para consumidor final', 'Online / delivery', 'Entrega a domicílio'];
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const num = (s: any) => Number(String(s ?? '').replace(',', '.')) || 0;
const hoje = () => new Date().toISOString().slice(0, 10);
const iniciais = (n: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const avatarOf = (n: string) => AV[(n || '').length % AV.length];
const inp: React.CSSProperties = { padding: '9px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: INK };
const lbl: React.CSSProperties = { display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: MUT, marginBottom: 4 };

export default function PDVPage() {
  usePageTitle('Ponto de venda', 'Registrar venda, orçamento e recebimento');

  const [data, setData] = useState(hoje());
  const [tipo, setTipo] = useState<'VENDA' | 'ORCAMENTO'>('VENDA');
  const [tipoVenda, setTipoVenda] = useState(TIPOS_VENDA[0]);
  const [caixaAberto, setCaixaAberto] = useState<boolean | null>(null);

  const [profs, setProfs] = useState<Prof[]>([]);
  const [profId, setProfId] = useState('');

  const [cliBusca, setCliBusca] = useState('');
  const [cliRes, setCliRes] = useState<Tutor[]>([]);
  const [cliAberto, setCliAberto] = useState(false);
  const [cliente, setCliente] = useState<Tutor | null>(null);
  const [petId, setPetId] = useState('');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [itemBusca, setItemBusca] = useState('');
  const [itemAberto, setItemAberto] = useState(false);
  const [qtd, setQtd] = useState(1);
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [descontoGlobal, setDescontoGlobal] = useState('');
  const [obs, setObs] = useState('');

  const [modal, setModal] = useState(false);
  const [formas, setFormas] = useState<Forma[]>([{ forma: 'Dinheiro', valor: 0 }]);
  const [salvando, setSalvando] = useState(false);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendaTab, setVendaTab] = useState<'NAO' | 'PAGO'>('NAO');
  const buscaTimer = useRef<any>(null);

  const loadVendas = useCallback(async () => {
    try { const r = await fetch('/api/caixa/vendas', { cache: 'no-store' }); if (r.ok) setVendas(await r.json()); } catch { /* */ }
  }, []);

  useEffect(() => {
    (async () => {
      try { const r = await fetch('/api/servicos/itens', { cache: 'no-store' }); if (r.ok) setServicos(await r.json()); } catch { /* */ }
      try {
        const r = await fetch('/api/users', { cache: 'no-store' });
        if (r.ok) { const d = await r.json(); const arr = Array.isArray(d) ? d : (d.users || d.data || []); setProfs(arr.map((u: any) => ({ id: u.id, name: u.name || u.nome || u.email }))); }
      } catch { /* */ }
      try {
        const r = await fetch('/api/caixa', { cache: 'no-store' });
        if (r.ok) { const d = await r.json(); const arr = Array.isArray(d) ? d : (d.data || []); setCaixaAberto(arr.some((c: any) => c.status === 'ABERTO')); }
        else setCaixaAberto(false);
      } catch { setCaixaAberto(false); }
    })();
    loadVendas();
  }, [loadVendas]);

  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (cliBusca.trim().length < 2) { setCliRes([]); return; }
    buscaTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tutors?search=${encodeURIComponent(cliBusca.trim())}&take=8`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        setCliRes(d.tutors || d.data || d || []); setCliAberto(true);
      } catch { /* */ }
    }, 350);
  }, [cliBusca]);

  const selCliente = (t: Tutor) => {
    setCliente(t); setCliAberto(false); setCliBusca('');
    const pets = t.pets || [];
    setPetId(pets.length === 1 ? pets[0].id : '');
  };
  const limparCliente = () => { setCliente(null); setPetId(''); setCliBusca(''); };

  const itensFiltrados = useMemo(() => {
    const q = itemBusca.trim().toLowerCase();
    if (!q) return [];
    return servicos.filter((s) => (s.nome || '').toLowerCase().includes(q)).slice(0, 12);
  }, [servicos, itemBusca]);

  const addItem = (s: Servico) => {
    setCarrinho((c) => {
      const i = c.findIndex((x) => x.servicoId === s.id);
      if (i >= 0) { const cp = [...c]; cp[i] = { ...cp[i], quantidade: cp[i].quantidade + qtd }; return cp; }
      return [...c, { servicoId: s.id, descricao: s.nome, quantidade: qtd, valorUnitario: Number(s.valorPadrao || 0), desconto: 0 }];
    });
    setItemBusca(''); setItemAberto(false); setQtd(1);
  };
  const addAvulso = () => setCarrinho((c) => [...c, { descricao: '', quantidade: 1, valorUnitario: 0, desconto: 0 }]);
  const updItem = (i: number, patch: Partial<CartItem>) => setCarrinho((c) => c.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmItem = (i: number) => setCarrinho((c) => c.filter((_, j) => j !== i));

  const itemTotal = (it: CartItem) => Math.max(0, it.quantidade * it.valorUnitario - it.desconto);
  const subtotal = useMemo(() => carrinho.reduce((s, it) => s + itemTotal(it), 0), [carrinho]);
  const total = useMemo(() => Math.max(0, subtotal - num(descontoGlobal)), [subtotal, descontoGlobal]);

  const somaFormas = useMemo(() => formas.reduce((s, f) => s + Number(f.valor || 0), 0), [formas]);
  const temDinheiro = formas.some((f) => /dinheiro/i.test(f.forma));
  const troco = temDinheiro && somaFormas > total ? somaFormas - total : 0;
  const pago = Math.max(0, somaFormas - troco);
  const restante = Math.max(0, total - pago);

  const pets = cliente?.pets || [];
  const baseValida = !!cliente && !!petId && carrinho.length > 0 && carrinho.every((it) => it.descricao.trim() && it.valorUnitario >= 0);

  const recebidoHoje = useMemo(() => vendas.reduce((s, v) => s + v.pago, 0), [vendas]);
  const aReceberHoje = useMemo(() => vendas.reduce((s, v) => s + Math.max(0, v.valor - v.pago), 0), [vendas]);

  const reset = () => {
    setCliente(null); setPetId(''); setCliBusca(''); setCarrinho([]); setDescontoGlobal(''); setObs('');
    setFormas([{ forma: 'Dinheiro', valor: 0 }]); setTipo('VENDA'); setQtd(1);
  };

  const payload = (extra: any) => ({
    tutorId: cliente!.id, petId, userId: profId || undefined, date: new Date(data + 'T12:00:00').toISOString(),
    itens: carrinho.map((it) => ({ servicoId: it.servicoId, productId: it.servicoId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: it.desconto })),
    desconto: num(descontoGlobal), observacao: obs || null, ...extra,
  });

  const enviar = async (body: any, msg: string) => {
    setSalvando(true);
    try {
      const r = await fetch('/api/caixa/pdv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Erro ao salvar');
      toast.success(msg + (d.troco ? ` · troco ${brl(d.troco)}` : ''));
      setModal(false); reset(); loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); } finally { setSalvando(false); }
  };

  const abrirRecebimento = () => { if (!baseValida) return; setFormas([{ forma: 'Dinheiro', valor: Number(total.toFixed(2)) }]); setModal(true); };
  const confirmarRecebimento = () => enviar(payload({ tipo: 'VENDA', formas: formas.filter((f) => Number(f.valor) > 0) }), 'Venda registrada!');
  const salvar = () => enviar(payload({ tipo }), tipo === 'ORCAMENTO' ? 'Orçamento salvo!' : 'Venda salva (a receber)');

  const vendasFiltradas = vendas.filter((v) => vendaTab === 'PAGO' ? v.pagoTotal : !v.pagoTotal);

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' };
  const chLeve: React.CSSProperties = { padding: '13px 16px', borderBottom: `1px solid ${SOFT}`, display: 'flex', alignItems: 'center', gap: 9 };
  const step = (emoji: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 11px' }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: NAVY }}>{label}</span>
    </div>
  );

  return (
    <div style={{ width: '100%', background: '#F6F2EA', minHeight: '100%' }}>
      <div style={{ width: '100%', padding: '18px 24px 60px', boxSizing: 'border-box', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ===== NOVA VENDA ===== */}
        <div style={{ flex: '1.7 1 480px', minWidth: 0, ...card }}>
          <div style={chLeve}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <div><div style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>Nova venda</div><div style={{ color: MUT, fontSize: 11.5 }}>{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div></div>
            {caixaAberto !== null && (
              <span style={{ marginLeft: 'auto', background: caixaAberto ? OKB : WARNB, color: caixaAberto ? OK : WARN, fontSize: 11.5, fontWeight: 500, padding: '4px 11px', borderRadius: 999 }}>
                {caixaAberto ? '✅ Caixa aberto' : '⚠️ Caixa fechado'}
              </span>
            )}
          </div>
          <div style={{ padding: 18 }}>

            {/* linha topo */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={lbl}>📅 Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ ...inp, width: '100%' }} />
              </div>
              <div style={{ minWidth: 160 }}>
                <label style={lbl}>Tipo</label>
                <div style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden' }}>
                  {(['VENDA', 'ORCAMENTO'] as const).map((t) => (
                    <button key={t} onClick={() => setTipo(t)} style={{ padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', background: tipo === t ? TEAL : '#fff', color: tipo === t ? '#fff' : INK2 }}>{t === 'VENDA' ? 'Venda' : 'Orçamento'}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={lbl}>Tipo de venda</label>
                <select value={tipoVenda} onChange={(e) => setTipoVenda(e.target.value)} style={{ ...inp, width: '100%' }}>
                  {TIPOS_VENDA.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* 1 cliente */}
            {step('👤', 'Cliente')}
            {!cliente ? (
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <div style={{ background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 12, padding: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input value={cliBusca} onChange={(e) => setCliBusca(e.target.value)} placeholder="🔍 Buscar cliente ou pet…" style={{ ...inp, flex: 1, minWidth: 180 }} />
                  <button onClick={() => setCliAberto(true)} style={{ border: 'none', borderRadius: 9, padding: '9px 14px', cursor: 'pointer', background: TEAL, color: '#fff', fontSize: 13, fontWeight: 500 }}>Pesquisar</button>
                </div>
                {cliAberto && cliRes.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: '0 8px 24px -6px rgba(0,0,0,.12)', maxHeight: 260, overflowY: 'auto' }}>
                    {cliRes.map((t) => (
                      <button key={t.id} onClick={() => selCliente(t)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '9px 12px', border: 'none', borderBottom: `1px solid ${SOFT}`, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', background: avatarOf(t.name).bg, color: avatarOf(t.name).fg, fontSize: 11, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(t.name)}</span>
                        <span style={{ color: INK }}>{t.name}</span>
                        <span style={{ color: MUT, fontSize: 11.5 }}>· {(t.pets || []).length} pet(s)</span>
                      </button>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: 11, color: MUT, margin: '7px 0 0' }}>Digite o nome do responsável ou do animal e clique em pesquisar.</p>
              </div>
            ) : (
              <div style={{ background: AGUA, border: `1px solid ${LINE}`, borderRadius: 12, padding: 13, marginBottom: 20, display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: NAVY, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(cliente.name)}</span>
                <div style={{ flex: 1, minWidth: 120 }}><div style={{ fontWeight: 500, color: NAVY }}>{cliente.name}</div><div style={{ fontSize: 11.5, color: INK2 }}>{pets.length} pet(s) cadastrado(s)</div></div>
                {pets.length === 0 ? (
                  <span style={{ fontSize: 12.5, color: WARN }}>Sem pets cadastrados</span>
                ) : (
                  <select value={petId} onChange={(e) => setPetId(e.target.value)} style={{ ...inp, minWidth: 150 }}>
                    <option value="">Selecione o pet…</option>
                    {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <button onClick={limparCliente} style={{ border: `1px solid ${LINE}`, background: '#fff', borderRadius: 9, padding: '8px 11px', cursor: 'pointer', color: INK2, fontSize: 12 }}>↺ trocar</button>
              </div>
            )}

            {/* 2 produtos */}
            {step('🛒', 'Produtos e serviços')}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={profId} onChange={(e) => setProfId(e.target.value)} style={{ ...inp, minWidth: 150 }} title="Profissional">
                <option value="">Profissional…</option>
                {profs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden' }}>
                <button onClick={() => setQtd((q) => Math.max(1, q - 1))} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', color: TEAL, fontSize: 15 }}>−</button>
                <span style={{ padding: '8px 12px', borderLeft: `1px solid ${SOFT}`, borderRight: `1px solid ${SOFT}`, minWidth: 18, textAlign: 'center', color: INK }}>{qtd}</span>
                <button onClick={() => setQtd((q) => q + 1)} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', color: TEAL, fontSize: 15 }}>+</button>
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
                <input value={itemBusca} onChange={(e) => { setItemBusca(e.target.value); setItemAberto(true); }} placeholder="🔍 Produto, serviço ou pacote" style={{ ...inp, width: '100%' }} />
                {itemAberto && itensFiltrados.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: '0 8px 24px -6px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto' }}>
                    {itensFiltrados.map((s) => (
                      <button key={s.id} onClick={() => addItem(s)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '9px 12px', border: 'none', borderBottom: `1px solid ${SOFT}`, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                        <span style={{ color: INK }}>{s.nome}</span><span style={{ color: MUT }}>{brl(Number(s.valorPadrao || 0))}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* carrinho */}
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              {carrinho.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>🛒</div>
                  <p style={{ fontSize: 12.5, color: MUT, margin: 0 }}>Busque acima para adicionar itens.</p>
                </div>
              )}
              {carrinho.map((it, i) => (
                <div key={i} style={{ borderBottom: `1px solid ${SOFT}`, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: SUAVE, border: `1px solid ${SOFT}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 15 }}>🏷️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                      <input value={it.descricao} onChange={(e) => updItem(i, { descricao: e.target.value })} placeholder="Descrição do item" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                      <button onClick={() => rmItem(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} title="Remover">🗑️</button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="number" min={1} value={it.quantidade} onChange={(e) => updItem(i, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} title="Qtd" style={{ ...inp, width: 52, padding: '6px 6px', textAlign: 'center' }} />
                      <span style={{ color: MUT, fontSize: 12 }}>×</span>
                      <input value={it.valorUnitario || ''} inputMode="decimal" placeholder="Unit." onChange={(e) => updItem(i, { valorUnitario: num(e.target.value) })} title="Valor unitário" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                      <input value={it.desconto || ''} inputMode="decimal" placeholder="Desc." onChange={(e) => updItem(i, { desconto: num(e.target.value) })} title="Desconto" style={{ ...inp, width: 70, padding: '6px 8px' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 500, color: NAVY, minWidth: 76, textAlign: 'right' }}>{brl(itemTotal(it))}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                <button onClick={addAvulso} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>➕ item avulso</button>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: INK2 }}>Desconto</span>
                  <input value={descontoGlobal} inputMode="decimal" placeholder="0,00" onChange={(e) => setDescontoGlobal(e.target.value)} style={{ ...inp, width: 90, padding: '6px 8px', textAlign: 'right' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: SUAVE, borderTop: `1px solid ${SOFT}` }}>
                <span style={{ color: INK2, fontSize: 13 }}>Total da venda</span>
                <span style={{ fontSize: 21, fontWeight: 500, color: NAVY }}>{brl(total)}</span>
              </div>
            </div>

            {/* 3 observações */}
            {step('📝', 'Observações')}
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="" style={{ ...inp, width: '100%', resize: 'vertical' }} />
            <p style={{ fontSize: 11, color: MUT, margin: '6px 0 18px' }}>As observações serão impressas no demonstrativo de venda ou orçamento.</p>

            {/* rodapé */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${SOFT}`, paddingTop: 16 }}>
              <button onClick={abrirRecebimento} disabled={!baseValida || tipo === 'ORCAMENTO'} style={{ border: 'none', borderRadius: 9, background: (baseValida && tipo === 'VENDA') ? TEAL : '#cfd8d9', color: '#fff', padding: '11px 18px', fontSize: 13.5, fontWeight: 500, cursor: (baseValida && tipo === 'VENDA') ? 'pointer' : 'not-allowed' }}>💰 Registrar recebimento</button>
              <button onClick={salvar} disabled={!baseValida || salvando} style={{ border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', padding: '11px 18px', fontSize: 13.5, cursor: baseValida ? 'pointer' : 'not-allowed', color: INK }}>{tipo === 'ORCAMENTO' ? '💾 Salvar orçamento' : '💾 Salvar'}</button>
              <button onClick={reset} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: MUT, padding: '11px', fontSize: 13, cursor: 'pointer' }}>✕ Cancelar</button>
            </div>
          </div>
        </div>

        {/* ===== COLUNA DIREITA ===== */}
        <div style={{ flex: '1 1 230px', minWidth: 215, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ ...chLeve, justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: NAVY, fontSize: 13.5, fontWeight: 500 }}>🧾 Vendas de hoje</span>
              <button onClick={loadVendas} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 14 }} aria-label="Atualizar">🔄</button>
            </div>
            <div style={{ padding: 13, display: 'flex', gap: 9 }}>
              <div style={{ flex: 1, background: OKB, borderRadius: 11, padding: '10px 12px' }}><div style={{ fontSize: 11, color: OK }}>Recebido</div><div style={{ fontSize: 16, fontWeight: 500, color: OK }}>{brl(recebidoHoje)}</div></div>
              <div style={{ flex: 1, background: WARNB, borderRadius: 11, padding: '10px 12px' }}><div style={{ fontSize: 11, color: WARN }}>A receber</div><div style={{ fontSize: 16, fontWeight: 500, color: WARN }}>{brl(aReceberHoje)}</div></div>
            </div>
            <div style={{ padding: '0 13px' }}>
              <div style={{ display: 'flex', fontSize: 12, borderBottom: `1px solid ${SOFT}` }}>
                {(['NAO', 'PAGO'] as const).map((t) => (
                  <button key={t} onClick={() => setVendaTab(t)} style={{ flex: 1, textAlign: 'center', border: 'none', background: 'none', cursor: 'pointer', paddingBottom: 8, fontFamily: 'inherit', fontSize: 12, color: vendaTab === t ? NAVY : MUT, fontWeight: 500, borderBottom: vendaTab === t ? `2px solid ${TEAL}` : '2px solid transparent' }}>{t === 'NAO' ? 'Não pago' : 'Pago'}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: '6px 13px 13px', minHeight: 90 }}>
              {vendasFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '18px 0' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🧾</div>
                  <p style={{ fontSize: 12, color: MUT, margin: 0 }}>Nenhuma venda {vendaTab === 'PAGO' ? 'paga' : 'pendente'}.</p>
                </div>
              )}
              {vendasFiltradas.slice(0, 8).map((v) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: `1px solid ${SOFT}` }}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: avatarOf(v.tutor).bg, color: avatarOf(v.tutor).fg, fontSize: 11.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciais(v.tutor)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.tutor}</div>
                    <div style={{ fontSize: 11, color: MUT }}>{v.pet}</div>
                  </div>
                  <span style={{ background: v.pagoTotal ? OKB : WARNB, color: v.pagoTotal ? OK : WARN, fontSize: 11, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{brl(v.valor)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={chLeve}><span style={{ color: NAVY, fontSize: 13.5, fontWeight: 500 }}>💵 Outros caixas</span></div>
            <div style={{ padding: 13, display: 'flex', gap: 9 }}>
              <Link href="/dashboard/erp/caixa" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', border: 'none', borderRadius: 9, background: TEAL, color: '#fff', padding: '10px', fontSize: 12.5, fontWeight: 500 }}>➕ Novo caixa</Link>
              <Link href="/dashboard/erp/caixa" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', color: INK2, padding: '10px', fontSize: 12.5 }}>💵 Meus caixas</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL RECEBIMENTO ===== */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>💰 Registrar recebimento</span>
              <button onClick={() => setModal(false)} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: '11px 14px' }}>
                <span style={{ fontSize: 13, color: INK2 }}>Total da venda</span>
                <span style={{ fontSize: 20, fontWeight: 500, color: NAVY }}>{brl(total)}</span>
              </div>
              {formas.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 7 }}>
                  <select value={f.forma} onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, forma: e.target.value } : x))} style={{ ...inp, flex: 1.3, padding: '8px' }}>{FORMAS.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                  <input value={f.valor || ''} inputMode="decimal" placeholder="R$" onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, valor: num(e.target.value) } : x))} style={{ ...inp, flex: 1, padding: '8px' }} />
                  {formas.length > 1 && <button onClick={() => setFormas(formas.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }}>🗑️</button>}
                </div>
              ))}
              <button onClick={() => setFormas([...formas, { forma: 'Pix', valor: 0 }])} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>➕ outra forma</button>

              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 2, borderTop: `1px solid ${SOFT}`, paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Pago</span><b style={{ color: NAVY }}>{brl(pago)}</b></div>
                {troco > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Troco</span><b style={{ color: OK }}>{brl(troco)}</b></div>}
                {restante > 0.001 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Saldo a receber</span><b style={{ color: WARN }}>{brl(restante)}</b></div>}
              </div>

              <button onClick={confirmarRecebimento} disabled={salvando} style={{ width: '100%', marginTop: 14, background: TEAL, color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, padding: 12, borderRadius: 9, cursor: 'pointer' }}>{salvando ? 'Registrando…' : '✓ Confirmar recebimento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
