/**
 * Kit visual do Portal do Tutor.
 *
 * O CSS aqui e PORTADO do protótipo aprovado (docs/portal-tutor/portal-tutor-emporio.html
 * e portal-login-mockup.html) — mesmas cores, mesmos raios, mesmos tamanhos.
 * Toda classe comeca com `ptl-` para nao esbarrar no CSS do app da equipe.
 */
'use client';

export const PTL_CSS = `
.ptl-root {
  --marinho:#0D2048; --turquesa:#00A1AE; --ceu:#D5F1F4; --camurca:#DECBB2;
  --chiclete:#F9B8C0; --verde:#1D9E75; --verde-bg:#E1F5EE;
  --rosa-txt:#4B1528; --rosa-txt2:#72243E;
  --cinza:#5F5E5A; --cinza-claro:#888780; --linha:#F1EFE8; --app-bg:#FAFCFD;

  font-family:'Nunito',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
  color:var(--marinho);
  background:#EAEFF2;
  min-height:100vh;
  display:flex; justify-content:center;
  -webkit-font-smoothing:antialiased;
}
.ptl-app {
  width:100%; max-width:400px; background:var(--app-bg); min-height:100vh;
  position:relative; box-shadow:0 0 40px rgba(13,32,72,.08);
  display:flex; flex-direction:column; padding:0 18px 28px;
}
.ptl-brand { display:flex; flex-direction:column; align-items:center; gap:7px; padding:34px 0 6px; }
.ptl-mark {
  width:56px; height:56px; border-radius:50%; background:var(--turquesa); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:29px;
}
.ptl-bname { font-size:17px; font-weight:700; letter-spacing:.2px; }
.ptl-btag { font-size:12px; color:var(--cinza); margin-top:-4px; }

.ptl-h { font-size:18px; font-weight:700; line-height:1.3; text-wrap:balance; }
.ptl-p { font-size:13px; color:var(--cinza); line-height:1.55; }
.ptl-stack { display:flex; flex-direction:column; gap:15px; margin-top:22px; }

.ptl-field { display:flex; flex-direction:column; gap:6px; }
.ptl-field label { font-size:12px; color:var(--cinza); font-weight:600; }
.ptl-input {
  width:100%; border:1px solid var(--camurca); background:#fff; border-radius:12px;
  padding:13px 15px; font:inherit; font-size:17px; font-weight:700; letter-spacing:.4px;
  color:var(--marinho); outline:none;
}
.ptl-input:focus { border-color:var(--turquesa); box-shadow:0 0 0 3px rgba(0,161,174,.16); }
.ptl-input::placeholder { color:var(--camurca); font-weight:600; letter-spacing:0; }

.ptl-btn {
  width:100%; border:none; border-radius:12px; padding:14px 16px; font:inherit;
  font-size:14.5px; font-weight:700; background:var(--turquesa); color:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center; gap:8px;
}
.ptl-btn:active:not(:disabled) { transform:scale(.985); }
.ptl-btn:disabled { opacity:.55; cursor:default; }
.ptl-btn.wa { background:var(--verde); }
.ptl-btn.ghost { background:#fff; color:var(--marinho); border:1px solid var(--camurca); }
.ptl-btn.quiet { background:var(--linha); color:var(--cinza); }
.ptl-btn:focus-visible { outline:3px solid rgba(0,161,174,.45); outline-offset:2px; }

.ptl-hint { font-size:11.5px; color:var(--cinza-claro); text-align:center; line-height:1.55; }
.ptl-hint b { color:var(--cinza); font-weight:700; }
.ptl-link {
  background:none; border:none; font:inherit; font-size:12.5px; font-weight:700;
  color:var(--turquesa); cursor:pointer; padding:4px; text-decoration:underline;
}

.ptl-otp { display:flex; gap:8px; justify-content:center; }
.ptl-otp input {
  width:100%; max-width:50px; height:58px; border-radius:12px; border:1px solid var(--camurca);
  background:#fff; text-align:center; font:inherit; font-size:24px; font-weight:800;
  color:var(--marinho); outline:none; font-variant-numeric:tabular-nums;
  -moz-appearance:textfield;
}
.ptl-otp input::-webkit-outer-spin-button, .ptl-otp input::-webkit-inner-spin-button { -webkit-appearance:none; margin:0; }
.ptl-otp input:focus { border-color:var(--turquesa); box-shadow:0 0 0 3px rgba(0,161,174,.16); }

.ptl-pick {
  display:flex; align-items:center; gap:11px; background:#fff; border:1px solid var(--camurca);
  border-radius:13px; padding:11px 13px; width:100%; text-align:left; font:inherit; cursor:pointer;
}
.ptl-pick .av {
  width:40px; height:40px; border-radius:50%; background:var(--ceu); color:var(--turquesa);
  display:flex; align-items:center; justify-content:center; font-size:21px; flex:none;
}
.ptl-pick b { font-size:14px; font-weight:700; display:block; color:var(--marinho); }
.ptl-pick small { font-size:11px; color:var(--cinza); display:block; }
.ptl-pick .radio { margin-left:auto; width:19px; height:19px; border-radius:50%; border:1.5px solid var(--camurca); flex:none; }
.ptl-pick.sel { border-color:var(--turquesa); background:var(--ceu); }
.ptl-pick.sel .radio { border-color:var(--turquesa); background:var(--turquesa); box-shadow:inset 0 0 0 3px var(--ceu); }
.ptl-pick.none { background:var(--linha); border-style:dashed; }
.ptl-pick.none .av { background:#fff; color:var(--cinza-claro); font-size:17px; }

.ptl-warn { background:var(--chiclete); border-radius:13px; padding:15px; display:flex; flex-direction:column; gap:5px; text-align:center; }
.ptl-warn b { font-size:14px; color:var(--rosa-txt); }
.ptl-warn small { font-size:12px; color:var(--rosa-txt2); line-height:1.55; }

.ptl-erro { font-size:12.5px; color:var(--rosa-txt2); background:#FCEBEB; border-radius:10px; padding:10px 12px; text-align:center; font-weight:600; }

.ptl-pet-row { display:flex; align-items:center; gap:11px; background:var(--ceu); border-radius:14px; padding:12px 14px; }
.ptl-pet-row .av {
  width:50px; height:50px; border-radius:50%; background:var(--turquesa); color:#fff;
  display:flex; align-items:center; justify-content:center; font-size:26px; flex:none; overflow:hidden;
}
.ptl-pet-row .av img { width:100%; height:100%; object-fit:cover; }
.ptl-pet-row b { font-size:17px; font-weight:800; display:block; line-height:1.2; }
.ptl-pet-row small { font-size:11.5px; color:#0F6E56; display:block; }

.ptl-card { background:#fff; border:1px solid var(--camurca); border-radius:13px; padding:15px; }
.ptl-vazio { text-align:center; color:var(--cinza-claro); font-size:13px; padding:22px 10px; line-height:1.6; }

/* ---------- Telas internas (Início, Minha ficha) — portado do protótipo ---------- */
.ptl-head {
  display:flex; align-items:center; gap:10px; font-size:17px; font-weight:700;
  color:var(--marinho); padding:20px 0 12px;
}
.ptl-back {
  width:32px; height:32px; border-radius:50%; border:none; cursor:pointer;
  background:var(--linha); color:var(--marinho);
  display:flex; align-items:center; justify-content:center; font-size:19px; flex:none;
}
.ptl-back:active { transform:scale(.94); }
.ptl-label { font-size:12px; color:var(--cinza); margin:4px 2px 8px; }

.ptl-avatar-wrap { position:relative; flex:none; }
.ptl-avatar-cam {
  position:absolute; right:-2px; bottom:-2px; width:21px; height:21px; border-radius:50%;
  background:var(--marinho); color:#fff; border:2px solid var(--ceu); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:10px; padding:0;
}

.ptl-alerta {
  width:100%; text-align:left; border:none; cursor:pointer; background:var(--chiclete);
  border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; font:inherit;
}
.ptl-alerta .lead { font-size:20px; color:var(--rosa-txt2); }
.ptl-alerta .t { font-size:13px; color:var(--rosa-txt); font-weight:700; }
.ptl-alerta .s { font-size:11px; color:var(--rosa-txt2); }
.ptl-alerta .chev { color:var(--rosa-txt2); margin-left:auto; }

.ptl-menu { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.ptl-menu-item {
  background:#fff; border:1px solid var(--camurca); border-radius:12px; padding:14px 12px;
  display:flex; flex-direction:column; align-items:flex-start; gap:3px; text-align:left;
  cursor:pointer; font:inherit; color:var(--marinho); text-decoration:none;
}
.ptl-menu-item:active { transform:scale(.98); }
.ptl-menu-item em { font-size:22px; font-style:normal; margin-bottom:2px; line-height:1; }
.ptl-menu-item span { font-size:13px; font-weight:700; }
.ptl-menu-item small { font-size:10px; color:var(--cinza-claro); }
.ptl-menu-item.contato { background:var(--turquesa); border-color:var(--turquesa); }
.ptl-menu-item.contato span { color:#fff; }
.ptl-menu-item.embreve { opacity:.62; cursor:default; }
.ptl-menu-item.embreve:active { transform:none; }
.ptl-tag-breve {
  font-size:9px; font-weight:800; letter-spacing:.04em; text-transform:uppercase;
  color:var(--cinza); background:var(--linha); border-radius:6px; padding:2px 6px; margin-top:3px;
}

.ptl-form { background:#fff; border:1px solid var(--camurca); border-radius:12px; padding:6px 14px; }
.ptl-linha {
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:10px 0; border-bottom:1px solid var(--linha);
}
.ptl-linha:last-child { border-bottom:none; }
.ptl-linha label { font-size:12px; color:var(--cinza); flex:none; }
.ptl-linha input {
  border:none; background:none; text-align:right; font-size:13px; color:var(--marinho);
  width:62%; outline:none; font-family:inherit;
}
.ptl-linha input:focus { color:var(--turquesa); }
.ptl-linha input:disabled { color:var(--cinza-claro); }
.ptl-linha .trava { display:flex; align-items:center; gap:6px; width:62%; justify-content:flex-end; }
.ptl-linha .trava input { width:auto; }
.ptl-linha .trava span { font-size:12px; color:#B4B2A9; }

.ptl-salvo {
  background:var(--verde-bg); color:#0F6E56; border-radius:10px; padding:11px 12px;
  font-size:12.5px; font-weight:700; text-align:center;
}
.ptl-aviso { font-size:11px; color:var(--cinza-claro); line-height:1.55; }

@media (prefers-reduced-motion:reduce) {
  .ptl-btn:active:not(:disabled), .ptl-menu-item:active, .ptl-back:active { transform:none; }
}
`;

/** Aplica o CSS do portal. Fica num componente para o Next injetar uma vez so. */
export function PtlEstilos() {
  return <style dangerouslySetInnerHTML={{ __html: PTL_CSS }} />;
}

/** Numero da clinica para os botoes de "falar com a gente". */
export const WHATSAPP_CLINICA =
  process.env.NEXT_PUBLIC_WHATSAPP_CLINICA || '5585999999999';

export function linkWhatsApp(texto: string) {
  return `https://wa.me/${WHATSAPP_CLINICA}?text=${encodeURIComponent(texto)}`;
}

/** Emoji do bichinho — o protótipo usa emoji enquanto nao ha foto. */
export function emojiEspecie(especie?: string | null) {
  const e = (especie || '').toUpperCase();
  if (e.includes('FEL') || e.includes('GAT')) return '🐱';
  if (e.includes('AVE') || e.includes('BIRD')) return '🐦';
  if (e.includes('EXO') || e.includes('REPT')) return '🦎';
  return '🐶';
}
