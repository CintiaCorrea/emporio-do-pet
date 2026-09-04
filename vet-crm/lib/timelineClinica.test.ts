import { describe, it, expect } from "vitest";
import { entraNaLinhaDoTempo, temConteudoClinico } from "./timelineClinica";

// BLINDAGEM da linha do tempo da ficha do pet.
//
// Em 04/09/2026 a Cintia relatou que a avaliacao de fisioterapia da Dra. Nayanna tinha
// "sumido" da ficha do Snoopy (#7974). Nao tinha: o filtro escondia qualquer atendimento
// cujo status casasse com /...|compareceu|.../ — e "Compareceu" e o status de quem VEIO
// e FOI ATENDIDO. O pedaco existia pra pegar "Nao compareceu" e pegava os dois.
//
// Estes testes existem pra isso nunca mais acontecer sem alguem perceber.
describe("timelineClinica", () => {
  describe("o caso que sumiu", () => {
    it('"Compareceu" ENTRA na linha do tempo (era o bug)', () => {
      expect(entraNaLinhaDoTempo({ status: "Compareceu" })).toBe(true);
    });
    it('"Nao compareceu" fica FORA — e o caso que o filtro queria pegar', () => {
      expect(entraNaLinhaDoTempo({ status: "Não compareceu" })).toBe(false);
      expect(entraNaLinhaDoTempo({ status: "Nao compareceu" })).toBe(false);
    });
    it("a avaliacao de fisioterapia da Dra. Nayanna aparece", () => {
      const avaliacao = {
        status: "Compareceu",
        chiefComplaint: "Avaliação de fisioterapia — dificuldade para subir escada",
      };
      expect(entraNaLinhaDoTempo(avaliacao)).toBe(true);
    });
  });

  describe("status que dizem que aconteceu", () => {
    it.each(["Atendido", "Realizado", "Finalizado", "Em atendimento", "Concluído"])(
      '"%s" entra',
      (s) => expect(entraNaLinhaDoTempo({ status: s })).toBe(true),
    );
  });

  describe("status que sao so agenda", () => {
    it.each(["Agendado", "Confirmado", "Remarcado", "Cancelado", "Bloqueada", "Programada", "Scheduled"])(
      '"%s" fica fora',
      (s) => expect(entraNaLinhaDoTempo({ status: s })).toBe(false),
    );
    it("faltou tambem fica fora", () => {
      expect(entraNaLinhaDoTempo({ status: "Faltou" })).toBe(false);
    });
  });

  describe("conteudo clinico manda mais que status", () => {
    it("agendado COM prescricao escrita aparece — alguem atendeu", () => {
      expect(entraNaLinhaDoTempo({ status: "Agendado", prescription: "<p>Dipirona 1x ao dia</p>" })).toBe(true);
    });
    it("agendado COM queixa aparece", () => {
      expect(entraNaLinhaDoTempo({ status: "Confirmado", chiefComplaint: "Vômito há 2 dias" })).toBe(true);
    });
    it("agendado SEM nada escrito continua fora", () => {
      expect(entraNaLinhaDoTempo({ status: "Agendado", prescription: "", chiefComplaint: null })).toBe(false);
    });
    it("prescricao so com HTML vazio nao conta como conteudo", () => {
      expect(temConteudoClinico({ prescription: "<p></p><br/>" })).toBe(false);
    });
  });

  describe("na duvida, mostrar", () => {
    it("sem status nenhum, aparece", () => {
      expect(entraNaLinhaDoTempo({})).toBe(true);
      expect(entraNaLinhaDoTempo({ status: "" })).toBe(true);
    });
    it("status desconhecido aparece — sumir informacao clinica e pior que uma linha a mais", () => {
      expect(entraNaLinhaDoTempo({ status: "Aguardando resultado do tutor" })).toBe(false); // 'aguardando' e agenda
      expect(entraNaLinhaDoTempo({ status: "Encaminhado ao especialista" })).toBe(true);
    });
  });

  describe("nao se importa com acento nem caixa", () => {
    it.each(["COMPARECEU", "compareceu", "Compareceu"])('"%s" entra', (s) =>
      expect(entraNaLinhaDoTempo({ status: s })).toBe(true),
    );
    it.each(["NÃO COMPARECEU", "não compareceu"])('"%s" fica fora', (s) =>
      expect(entraNaLinhaDoTempo({ status: s })).toBe(false),
    );
  });
});
