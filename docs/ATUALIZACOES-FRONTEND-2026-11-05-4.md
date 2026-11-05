# Atualizações do front-end — 05/11/2026 (revisão 4)

## Base e integração
- Atualização aplicada sobre o ZIP fornecido nesta conversa. O próprio pacote identifica como base a branch `main`, commit `7c84e4c`.
- A tentativa de consultar o repositório remoto `lisboavinicius344-eng/EloCampus-` não foi concluída pelo ambiente; portanto, esta entrega não afirma conter commits posteriores a `7c84e4c`.
- Nenhuma rota de API nova foi presumida.

## Fluxos de aluno e professor
- A devolução continua sendo registrada pela equipe do acervo. A área de aluno/professor informa “Entregue à equipe do acervo” e explica que o equipamento deve ser entregue presencialmente para conferência e registro.
- A página `devolucoes.html` permanece fora da lista de páginas permitidas a aluno/professor; acesso direto pela URL retorna ao painel.
- “Minhas reservas” mantém um único fluxo de reserva: o botão “Reservar equipamento” abre `novo-emprestimo.html`; “Reservar novamente” envia os IDs dos equipamentos anteriores para pré-seleção.
- A confirmação da reserva retorna a `reservas.html?salvo=registrado`, que apresenta a mensagem de envio para análise.

## Empréstimos e solicitantes
- A lista de empréstimos considera vencido o horário exato da devolução prevista. O item que vence hoje passa a aparecer em “Atrasados” assim que o horário expira; o texto é “Atrasado desde hoje”. Itens com vencimento ainda futuro no mesmo dia continuam como “Vence hoje”.
- O cadastro de empréstimo permite pesquisar solicitantes por nome ou matrícula, selecionando o cadastro correspondente e preenchendo automaticamente o vínculo.
- O vínculo pode ser alterado para “Grupo ou setor”; o campo complementar sugere setores já existentes no acervo e aceita texto livre. Como o contrato da API não expõe campos próprios para grupo/setor no empréstimo, esse detalhe é registrado nas observações enviadas à API.
- IDs longos de solicitantes podem quebrar linha; os rótulos de vínculo ficam em uma linha.

## Manutenções
- “Enviar para manutenção” exige duas confirmações antes de abrir a manutenção.
- A coluna de ações permite inativar o equipamento associado à manutenção, exigindo motivo e duas confirmações. O front-end usa o método já existente `ELO.removerEquipamento`, que chama `PATCH /equipamentos/{id}/inativar` e envia `observacoes`.
- O título, filtro de situação e botão Atualizar receberam ajustes de alinhamento.

## Navegação e responsividade
- Empréstimos e Devoluções receberam estados visuais distintos, com transições de hover/seleção e destaque do item ativo.
- O zoom global de 90% deixa de ser aplicado em telas móveis, evitando que a largura CSS do body exceda a largura real do viewport.
- As tabelas permanecem com rolagem horizontal interna aos seus quadros.

## Validação executada
- `node --check` nos 26 arquivos JavaScript: aprovado.
- `node tests/api-contract-smoke.cjs`: aprovado.
- A validação funcional final ainda depende de testes com contas reais de aluno, professor e equipe, além da API em execução.
