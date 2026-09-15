// AVISA O SISTEMA DE QUE UMA TELA QUEBROU.
//
// Cintia, 15/09/2026: "às vezes, como não acontecem comigo, não sei nem como nem porque estão
// acontecendo". Foi o que custou uma tarde inteira: a Dra. Vivian não salvava um orçamento, o
// servidor não registrava nada — porque o pedido morria antes de chegar — e eu procurei no
// lugar errado.
//
// TRÊS REGRAS QUE ESTA PEÇA NUNCA PODE QUEBRAR:
//
// 1. NUNCA derrubar a tela de quem está trabalhando. Todo o caminho é envolto em try/catch e
//    falha em silêncio. Relatório de erro que causa erro é piada pronta.
// 2. NUNCA entrar em laço. Se o próprio envio falhar, ele não reporta a própria falha.
// 3. NUNCA inundar. O mesmo erro, na mesma tela, é enviado uma vez a cada 5 minutos — o resto o
//    servidor agrupa. Um erro que dispara a cada tecla digitada encheria a lista e esconderia
//    justamente o que é raro, que é para isso que a lista existe.

const ULTIMO: Record<string, number> = {};
const INTERVALO_MS = 5 * 60 * 1000;
let enviando = false;

export function avisarErro(mensagem: unknown, detalhe?: unknown): void {
  try {
    if (typeof window === 'undefined') return;
    const msg = String(
      (mensagem as any)?.message ?? mensagem ?? '',
    ).trim().slice(0, 400);
    if (!msg) return;

    // Ruído conhecido do navegador, que não diz nada sobre o sistema.
    if (/ResizeObserver loop|Script error\.?$/i.test(msg)) return;

    const tela = window.location?.pathname || '';
    const chave = `${tela}|${msg}`;
    const agora = Date.now();
    if (ULTIMO[chave] && agora - ULTIMO[chave] < INTERVALO_MS) return;
    ULTIMO[chave] = agora;

    if (enviando) return;   // um de cada vez: rajada de erros não vira rajada de requisições
    enviando = true;

    const corpo = JSON.stringify({
      mensagem: msg,
      tela,
      detalhe: String(
        (detalhe as any)?.stack ?? (mensagem as any)?.stack ?? detalhe ?? '',
      ).slice(0, 2000) || undefined,
    });

    fetch('/api/erros-tela', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo,
      keepalive: true,   // sobrevive à navegação: erro em quem está saindo da página também conta
    })
      .catch(() => { /* regra 2: o envio falhar não vira outro erro */ })
      .finally(() => { enviando = false; });
  } catch {
    enviando = false;   // regra 1
  }
}

/** Liga os avisos do navegador. Chamado uma vez, no componente que fica montado sempre. */
export function ligarCacaErros(): () => void {
  if (typeof window === 'undefined') return () => {};

  const onErro = (ev: ErrorEvent) => avisarErro(ev?.error || ev?.message, ev?.error);
  const onPromessa = (ev: PromiseRejectionEvent) => avisarErro(ev?.reason, ev?.reason);

  window.addEventListener('error', onErro);
  window.addEventListener('unhandledrejection', onPromessa);
  return () => {
    window.removeEventListener('error', onErro);
    window.removeEventListener('unhandledrejection', onPromessa);
  };
}
