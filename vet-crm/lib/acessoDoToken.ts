/**
 * QUANTO FALTA PARA O ACESSO VENCER.
 *
 * O acesso ao servidor é um JWT que vale 7 dias. Várias rotas do site o usavam sem nunca renovar:
 * uma semana depois do login passavam a responder 401 — e a tela falhava calada. Foi assim que a
 * receita do Kiss (Dr. Gabriel, 16/09/2026) saiu sem assinatura: a lista de profissionais voltou
 * vazia.
 *
 * Lê só o `exp` do token, SEM conferir a assinatura: quem confere é o servidor. Aqui a pergunta é
 * apenas "vale a pena renovar antes de mandar?". Sem `exp` legível, devolve null e a rota segue
 * com o token que tem — melhor tentar do que bloquear.
 */
export function segundosParaVencer(accessToken: string | null | undefined, agoraMs: number = Date.now()): number | null {
  try {
    const partes = String(accessToken || "").split(".");
    if (partes.length !== 3) return null;
    const b64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof atob === "function"
      ? atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="))
      : Buffer.from(b64, "base64").toString("utf8");
    const exp = Number(JSON.parse(json)?.exp);
    if (!Number.isFinite(exp)) return null;
    return Math.floor(exp - agoraMs / 1000);
  } catch {
    return null;
  }
}

/** Renova quando falta um minuto ou menos — ou quando já venceu. */
export const precisaRenovar = (segundos: number | null) => segundos !== null && segundos <= 60;
