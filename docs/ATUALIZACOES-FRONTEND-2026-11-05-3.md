# Atualizações do front-end — 05/11/2026 (3)

## Ajustes aplicados
- Usuários finais não podem mais acessar a página de devoluções pela navegação interna; o fluxo de devolução permanece sob responsabilidade da equipe do acervo.
- Em “Meus empréstimos”, itens ativos exibem “Entregue à equipe do acervo” em vez de uma ação de devolução.
- Em “Minhas reservas”, o formulário antigo com seleção múltipla por Ctrl/Command deixa de ser exibido. A ação “Reservar” leva ao fluxo unificado de novo empréstimo/reserva.
- “Reservar novamente” direciona para `novo-emprestimo.html` com os equipamentos anteriores pré-selecionados pela query string.
- A confirmação de reserva redireciona para “Minhas reservas” com mensagem de sucesso.
- A retirada de reserva aprovada não solicita mais uma data manual de devolução; utiliza o fim do período reservado e pede confirmação simples.

## Limitações mantidas por contrato
A ação de inativação de equipamento não foi criada nesta atualização porque a camada `api.js` disponível não expõe método/rota de inativação. Não foi inventado endpoint. A inclusão depende da confirmação do contrato da API.

## Validação
Os arquivos JavaScript alterados passaram pela verificação sintática `node --check`. A validação funcional completa depende da API em execução e de contas de teste com perfis de equipe, aluno e professor.
