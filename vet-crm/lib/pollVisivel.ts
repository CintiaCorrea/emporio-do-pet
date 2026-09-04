// NÚCLEO ÚNICO — "só pergunta ao servidor enquanto alguém está olhando".
//
// As telas que se atualizam sozinhas (inbox, agenda, hoje) perguntavam de X em X segundos
// para sempre: com a aba no fundo, com a máquina esquecida ligada de madrugada, com a tela
// bloqueada. Em 03/09/2026 os registros do servidor mostravam duas telas do inbox pedindo a
// lista inteira de conversas 8 vezes por minuto à meia-noite e quarenta, sem ninguém na
// clínica. Cada um desses pedidos ocupa uma vaga na fila do banco que a recepcionista
// precisava para receber uma venda.
//
// A regra fica aqui, num lugar só: aba escondida não pergunta; quando ela reaparece,
// pergunta na hora — assim a tela já volta atualizada, sem esperar o próximo ciclo.

const aVista = () => typeof document === 'undefined' || !document.hidden;

/**
 * Igual a setInterval, mas pula os ciclos em que a aba não está à vista e dispara uma
 * atualização imediata quando ela volta. Devolve a função de limpeza (use no return do
 * useEffect, no lugar de clearInterval).
 */
export function pollVisivel(tarefa: () => void, intervaloMs: number): () => void {
  const id = setInterval(() => { if (aVista()) tarefa(); }, intervaloMs);
  const aoVoltar = () => { if (aVista()) tarefa(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', aoVoltar);
  return () => {
    clearInterval(id);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', aoVoltar);
  };
}
