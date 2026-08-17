// Sinaliza se a aba "Internas" do inbox está aberta AGORA. O RecadoPopup usa isso pra
// NÃO popar o card de recado interno quando a pessoa já está nas mensagens internas
// (evita duplicidade — ela já está vendo/escrevendo ali). Singleton simples de módulo.
let internasAberta = false;
export const setInternasAberta = (v: boolean) => { internasAberta = v; };
export const isInternasAberta = () => internasAberta;
