'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

/** Cabeçalho + abas do módulo Financeiro (navegáveis). */
export function FinTabs({
  active,
  right,
}: {
  active: 'lancamentos' | 'agenda' | 'fornecedores' | 'regras' | 'conciliacao' | 'dre' | 'parceria' | 'taxas' | 'cadastros';
  right?: ReactNode;
}) {
  const tab = (key: string, label: string, href: string) =>
    active === key ? (
      <span className="fin-tab on">{label}</span>
    ) : (
      <Link className="fin-tab" href={href}>
        {label}
      </Link>
    );
  return (
    <div className="fin-head">
      <h1>Financeiro</h1>
      {tab('lancamentos', 'Lançamentos', '/dashboard/financeiro')}
      {tab('agenda', 'A pagar/receber', '/dashboard/financeiro/agenda')}
      {tab('fornecedores', 'Fornecedores', '/dashboard/financeiro/fornecedores')}
      {tab('regras', 'Regras', '/dashboard/financeiro/regras')}
      {tab('conciliacao', 'Conciliação', '/dashboard/financeiro/conciliacao')}
      {tab('dre', 'DRE', '/dashboard/financeiro/dre')}
      {tab('parceria', 'Parceria', '/dashboard/financeiro/parceria')}
      {tab('taxas', 'Taxas', '/dashboard/financeiro/taxas')}
      {tab('cadastros', '⚙ Cadastros', '/dashboard/financeiro/cadastros')}
      <span className="fin-spacer" />
      {right}
    </div>
  );
}

export const fmtBRL = (c: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);

/** CSS do módulo (portado do mockup, classes fin- escopadas em .fin-root). */
export const FIN_CSS = `
.fin-root { --primary:#009AAC; --navy:#014D5E; --coral:#D85A30; --green:#1c7a47; --green-bg:#E7F6EE;
  --gold:#B8860B; --gold-bg:#FAF1DC; --coral-bg:#FBEDE6; --text1:#1F2A2E; --text2:#5C6B70; --text3:#8A989D;
  --line:#E8E2D6; --lineSoft:#F0EBE0; --tint:#E0F4F6;
  color:var(--text1); font-size:14px; padding:20px; display:flex; flex-direction:column; gap:14px; }
.fin-root h1,.fin-root h2,.fin-root h3,.fin-root p{ margin:0; }
.fin-head{ display:flex; align-items:center; gap:16px; border-bottom:1px solid var(--line); padding:0 2px 10px; }
.fin-head h1{ font-size:16px; font-weight:500; }
.fin-tab{ font-size:13.5px; color:var(--text2); padding-bottom:10px; margin-bottom:-11px; text-decoration:none; }
.fin-tab.on{ color:var(--navy); border-bottom:2px solid var(--primary); }
.fin-tab.soon{ color:var(--text3); }
.fin-spacer{ flex:1; }
.fin-btn{ font-size:13px; font-weight:500; border-radius:9px; padding:8px 14px; border:1px solid var(--line);
  background:#fff; color:var(--navy); cursor:pointer; }
.fin-btn.primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
.fin-btn.sm{ font-size:12px; padding:5px 10px; }
.fin-btn.ghost{ color:var(--coral); border-color:var(--line); }
.fin-btn:disabled{ opacity:.6; cursor:default; }
.fin-card{ background:#fff; border:1px solid var(--line); border-radius:13px; box-shadow:0 1px 2px rgba(52,50,46,.04); overflow:hidden; }
.fin-card-head{ display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid var(--lineSoft); }
.fin-card-head h2{ font-size:13px; font-weight:500; color:var(--text2); }
.fin-tbl-scroll{ overflow-x:auto; }
.fin-tbl{ width:100%; border-collapse:collapse; font-size:13px; min-width:820px; }
.fin-tbl th{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); font-weight:500; text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); white-space:nowrap; }
.fin-tbl td{ padding:11px 12px; border-bottom:1px solid var(--lineSoft); color:var(--text1); vertical-align:middle; }
.fin-tbl tr:last-child td{ border-bottom:none; }
.fin-tbl .num{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.fin-tbl .acoes{ white-space:nowrap; display:flex; gap:6px; justify-content:flex-end; }
.fin-empty{ text-align:center; color:var(--text3); padding:26px 0 !important; }
.fin-root .pill{ display:inline-block; font-size:11px; padding:3px 9px; border-radius:999px; background:#F3F1EC; color:var(--text2); white-space:nowrap; margin-right:4px; }
.fin-root .pill.marca{ background:var(--tint); color:var(--navy); }
.fin-root .pill.rec{ background:var(--green-bg); color:var(--green); }
.fin-root .pill.desp{ background:var(--coral-bg); color:var(--coral); }
.fin-root .pill.dash{ color:var(--text3); background:transparent; padding-left:0; }
.fin-def{ font-size:11px; padding:3px 9px; border-radius:999px; border:1px dashed #DCC58A; background:var(--gold-bg); color:var(--gold); font-weight:500; }
.fin-overlay{ position:fixed; inset:0; background:rgba(20,25,28,.35); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; z-index:50; overflow:auto; }
.fin-modal{ width:100%; max-width:540px; background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 12px 40px rgba(20,25,28,.18); overflow:hidden; }
.fin-modal-head{ padding:16px 20px; border-bottom:1px solid var(--lineSoft); display:flex; align-items:center; }
.fin-modal-head h3{ font-size:14px; font-weight:500; }
.fin-modal-body{ padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
.fin-modal-foot{ padding:14px 20px; border-top:1px solid var(--lineSoft); display:flex; gap:8px; justify-content:flex-end; }
.fin-root .row2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.fin-root .row3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.fin-root .f label{ display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); font-weight:500; margin-bottom:4px; }
.fin-root .f .fin-ctl{ width:100%; }
.fin-root .f .hint{ font-size:11px; color:var(--text3); margin-top:4px; }
.fin-ctl{ font-size:13px; border:1px solid var(--line); border-radius:9px; padding:6px 10px; background:#fff; color:var(--text1); }
.fin-switch{ display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--text1); cursor:pointer; }
.fin-tbl .dt{ white-space:nowrap; color:var(--text2); font-variant-numeric:tabular-nums; }
.fin-tbl .dt.venc{ color:var(--coral); font-weight:500; }
.fin-tbl .rec{ color:var(--green); } .fin-tbl .desp{ color:var(--coral); }
.fin-tbl .desc{ font-weight:500; } .fin-tbl .sub{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-sit{ display:inline-flex; width:22px; height:22px; border-radius:50%; align-items:center; justify-content:center; font-size:14px; font-weight:500; }
.fin-sit.ok{ background:var(--green-bg); color:var(--green); }
.fin-sit.warn{ background:var(--coral-bg); color:var(--coral); }
.fin-sit.q{ background:var(--gold-bg); color:var(--gold); }
.fin-drop{ border:1.5px dashed var(--line); border-radius:12px; padding:22px; text-align:center; background:#FBF9F4; color:var(--text2); font-size:13px; }
@media (max-width:900px){ .fin-root .row2,.fin-root .row3{ grid-template-columns:1fr; } }
`;
