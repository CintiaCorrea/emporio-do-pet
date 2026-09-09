// Fechar o modal clicando no fundo — SEM fechar quando a pessoa está selecionando texto.
//
// O bug (Cintia, 09/09/2026): "quando clico para alterar algum item da comanda, marco a
// palavra e ela simplesmente fecha". Ao arrastar para selecionar, o mouse desce DENTRO do
// campo e sobe FORA dele; o navegador então dispara o `click` no ancestral comum — que é o
// fundo. O `stopPropagation()` do miolo não impede: o alvo do clique já É o fundo.
//
// A correção é exigir que o clique tenha COMEÇADO no fundo. Quem começou dentro e terminou
// fora estava selecionando, não querendo sair.
//
// Uso:  <div className="fixed inset-0 ..." {...fundoDeModal(() => setAberto(false))}>
//
// A marca é de módulo (uma só) de propósito: só existe um ponteiro por vez, e assim o helper
// pode ser espalhado por JSX sem virar hook — modal costuma ser renderizado condicionalmente,
// e hook não pode.
let comecouNoFundo = false;

export function fundoDeModal(fechar: () => void) {
  return {
    onMouseDown: (e: React.MouseEvent) => {
      comecouNoFundo = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent) => {
      const noFundo = e.target === e.currentTarget;
      const podeFechar = comecouNoFundo && noFundo;
      comecouNoFundo = false;
      if (podeFechar) fechar();
    },
  };
}
