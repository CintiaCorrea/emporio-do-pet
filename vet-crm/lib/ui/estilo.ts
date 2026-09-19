// O ARQUIVO DE REGRAS DO VISUAL (19/09/2026) — Bloco 1 da padronização.
//
// Por que existe: em 18/09/2026 o sistema tinha 671 cores escritas à mão em 10.124 lugares,
// 36 tamanhos de letra, 17 cantos e 5 beges diferentes para a MESMA caixa branca. Não era
// desleixo: nada obrigava. Existia um arquivo central de cores, usado por 11 arquivos de 290.
//
// A partir daqui, quem constrói usa o NOME, não o número. Quem quiser mudar uma cor do sistema
// muda aqui, num lugar só. As mesmas cores estão em styles/globals.css, para quem prefere
// classe do Tailwind (bg-turquesa, text-marinho, border-borda).
//
// Cintia, 18/09: "as margens poderiam SEMPRE ser obedecidas e ser as mesmas".

/** As cores da casa. São estas e mais nenhuma. */
export const CORES = {
  /** A cor da ação principal: botão que salva, aba aberta, item de menu escolhido. */
  turquesa: "#009AAC",
  /** O azul escuro dos títulos e do texto em destaque. */
  marinho: "#014D5E",
  /** Confirmado, recebido, no prazo. */
  verde: "#0F6E56",
  /** O que apaga e o que está em atraso. Só isso. */
  vermelho: "#A32D2D",
  /** Aviso e pendência — nem erro, nem tudo certo. */
  ambar: "#8A5A0B",

  /** O bege do fundo de todas as telas. */
  fundo: "#F6F2EA",
  /** O branco do cartão. */
  cartao: "#FFFFFF",
  /** A borda do cartão. É este bege, o que já está na tela — não os outros quatro. */
  borda: "#E8DFC8",
  /** A divisória DENTRO do cartão, mais clara que a borda de fora. */
  linha: "#F0EBE0",
  /** O fundo do item escolhido num menu ou numa lista. */
  realce: "#E0F4F6",

  /** O texto normal. */
  texto: "#1F2A2E",
  /** Explicação, apoio, segunda linha. */
  textoSuave: "#5F5E5A",
  /** Etiqueta, rodapé, o que quase não se lê. */
  textoFraco: "#8A8778",
} as const;

/** Cinco degraus de letra. Se um texto não couber em nenhum, o problema é o texto. */
export const LETRA = {
  /** 20px — título da tela (só quando a tela precisa de um, porque o normal é vir do menu). */
  titulo: 20,
  /** 15px — título de cartão. */
  cartao: 15,
  /** 13px — o texto do dia a dia. É o mais usado. */
  corpo: 13,
  /** 12px — apoio e explicação. */
  apoio: 12,
  /** 10,5px — etiqueta em maiúsculas. */
  etiqueta: 10.5,
} as const;

/** Cantos arredondados. Três, não dezessete. */
export const CANTO = {
  /** 13px — o cartão. */
  cartao: 13,
  /** 9px — o botão. */
  botao: 9,
  /** 8px — botão de ícone, campo, item de menu. */
  miudo: 8,
} as const;

/** Espaçamento. A margem da borda da tela é dada pela moldura, não pela tela (Bloco 2). */
export const ESPACO = {
  /** 24px — a margem da borda da tela no computador (p-6). */
  margem: 24,
  /** 16px — a mesma margem no celular (p-4). */
  margemCelular: 16,
  /** 14px — o recheio de dentro do cartão. */
  recheioCartao: 14,
} as const;

/** Sombra: só no que FLUTUA (janela, gaveta, aviso). Cartão não tem sombra. */
export const SOMBRA_DO_QUE_FLUTUA = "0 10px 30px rgba(1,77,94,.12)";
