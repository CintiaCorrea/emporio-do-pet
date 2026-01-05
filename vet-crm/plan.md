Plano: Feature Completa de Edição de Comissões

Objetivo
Adicionar funcionalidade completa de edição de comissões na rota app/(user)/dashboard/erp/comissoes, permitindo editar valor total, taxa de comissão e valor da comissão diretamente.

Mudanças Necessárias
1. Atualizar API de Comissões
Arquivo: `app/api/commissions/[id]/route.ts`

Atualizar o método PATCH para aceitar:
totalValue: valor total do serviço
commissionRate: taxa de comissão (percentual)
commissionValue: valor da comissão diretamente (opcional, se fornecido, sobrescreve o cálculo)
Lógica de cálculo:
Se commissionValue for fornecido, usar esse valor diretamente
Caso contrário, calcular: commissionValue = (totalValue * commissionRate) / 100
Se apenas totalValue for alterado, manter a taxa atual e recalcular
Se apenas commissionRate for alterado, recalcular baseado no valor total atual
Armazenar taxa customizada no campo notes do appointment como JSON (se diferente da taxa padrão)

2. Atualizar Página de Comissões
Arquivo: app/(user)/dashboard/erp/comissoes/page.tsx

2.1 Adicionar Estado de Edição
Adicionar estado isEditMode para controlar modo de edição no modal
Adicionar estado editForm com campos editáveis:
totalValue
commissionRate
commissionValue (opcional, para override manual)

2.2 Adicionar Botão de Editar
Adicionar botão "Editar" no modal de detalhes (ao lado de "Marcar como Pago")
Botão deve alternar entre modo visualização e edição

2.3 Criar Formulário de Edição
Transformar campos de valores no modal em inputs editáveis quando em modo edição:
Input numérico para "Valor do Serviço" (totalValue)
Input numérico para "Taxa de Comissão" (commissionRate) com sufixo "%"
Input numérico opcional para "Valor da Comissão" (commissionValue) com checkbox "Valor fixo"
Adicionar preview em tempo real do valor calculado
Validações:
Valor total >= 0
Taxa entre 0-100%
Valor da comissão >= 0 (se fornecido)

2.4 Implementar Função de Salvar
Criar função handleUpdateCommission que:
Chama API PATCH `/api/commissions/[id]`
Envia dados do formulário
Atualiza lista local após sucesso
Mostra toast de sucesso/erro
Fecha modo de edição

2.5 Adicionar Botão de Editar na Tabela (Opcional)
Adicionar ícone de edição (LuPencil) na coluna "Ações" da tabela
Ao clicar, abre modal já em modo edição

3. Melhorias de UX
Adicionar indicador visual quando em modo edição (ex: borda azul no modal)
Mostrar diferença entre valor calculado e valor customizado (se houver)
Adicionar botão "Cancelar" para descartar alterações
Adicionar confirmação antes de salvar se houver mudanças significativas
Mostrar histórico de alterações (opcional, futuro)
Estrutura de Dados
Request Body (PATCH)
{
  totalValue?: number;        // Valor total do serviço
  commissionRate?: number;    // Taxa de comissão (0-100)
  commissionValue?: number;   // Valor fixo da comissão (override)
  status?: 'PENDING' | 'PAID' | 'CANCELLED';
}
Lógica de Cálculo
Se commissionValue fornecido → usar valor direto
Se commissionRate fornecido → calcular: (totalValue * commissionRate) / 100
Se apenas totalValue alterado → manter taxa atual e recalcular
Se nenhum fornecido → usar taxa padrão do tipo de serviço
Arquivos a Modificar
`app/api/commissions/[id]/route.ts` - Atualizar PATCH para suportar edição completa
app/(user)/dashboard/erp/comissoes/page.tsx - Adicionar UI de edição e lógica
Considerações
A taxa customizada será armazenada no campo notes do appointment como JSON
O valor da comissão pode ser fixo (override) ou calculado automaticamente
Validações devem garantir consistência dos dados
Feedback visual claro sobre modo de edição vs visualização
