# Atualizações do front-end — 05/11/2026 (revisão 2)

Base utilizada: pacote `EloCampus-atualizacao-reservas-devolucoes-2026-11-05.zip`, derivado da branch `main` e do commit `7c84e4c` conforme documentação já presente no pacote. A identidade visual e a estrutura geral foram preservadas.

## Ajustes aplicados
- Retirada/inativação de equipamento agora exige motivo/observação tanto na listagem quanto na página de detalhes. O front-end envia `{ observacoes }` no `PATCH /equipamentos/{id}/inativar`.
- A etapa de revisão de empréstimo/reserva usa botões compactos, alinhados e com espaçamento consistente; em telas estreitas, os botões passam a ocupar a largura disponível.
- Os itens selecionados para empréstimo e devolução recebem destaque visual. A seleção da devolução é refletida diretamente no cartão do equipamento.
- O autoatendimento de devolução exibe a mesma conferência do fluxo da equipe: condição, cabos/acessórios, limpeza/verificação visual e confirmação de recebimento/assinatura. As três confirmações são obrigatórias antes de avançar.
- A lista de reservas tem ordenação explícita por situação para os dois tipos de conta. A ordem prioriza reservas pendentes na equipe e aprovadas no autoatendimento; dentro de cada situação, usa a data de início.
- “Reservar novamente” retorna à página de reservas, abre o formulário “Reservar equipamento” e pré-seleciona os equipamentos anteriores ainda disponíveis.
- A tabela de solicitantes usa colunas dimensionadas, evita quebra arbitrária de palavras e mantém rolagem horizontal quando necessário.
- O cadastro de acesso apresenta somente os vínculos “Aluno” e “Professor/Servidor”. O segundo mantém o valor de integração `professor` já aceito pelo formulário/API; não foi criado um novo tipo de vínculo.
- O rodapé do cadastro remove o separador pontuado entre “Voltar para o login” e “Aviso de privacidade”, mantendo distância visual entre os links.

## Validação
- `node --check` executado nos scripts JavaScript alterados: aprovado.
- `node tests/api-contract-smoke.cjs`: aprovado.

## Observação de integração
O pacote disponível nesta conversa não contém o arquivo `API.md`. A rota de inativação já utilizada pelo projeto foi preservada; agora o front-end envia o motivo no corpo da requisição. A API precisa aceitar e persistir o campo `observacoes` nessa rota para que a obrigatoriedade também seja garantida no servidor. A validação do front-end, isoladamente, não substitui a validação da API.
