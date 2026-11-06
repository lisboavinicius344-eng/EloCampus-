# Ajustes consolidados do frontend — 06/11/2026 (revisão 3)

Esta revisão foi aplicada sobre o pacote recebido e mantém a integração com a API existente.

## Principais correções

- Paleta global reorganizada para azul/rosa como identidade de marca; estados de equipamento continuam semânticos (verde, azul, vermelho, amarelo e cinza).
- Cartão “Emprestados” do dashboard agora usa “Em circulação”, evitando afirmar que todos estão dentro do prazo.
- Removido o zoom global em telas móveis, corrigindo o body maior que o viewport em larguras como 390 px.
- Histórico de movimentações traduz os tipos conhecidos e não exibe mais “— Equipamento” quando faltam dados do item.
- “Retirar equipamento” deixa de aparecer para equipamentos baixados/inativos/em manutenção.
- Senha provisória foi removida definitivamente da tela de solicitações de acesso; quando o e-mail falhar, a orientação é usar “Reenviar instruções”.
- Confirmações e perguntas críticas passaram a usar caixas integradas ao site, sem `window.confirm`/`window.prompt`.
- A abertura de manutenção não oferece mais inativação simultânea. A manutenção apenas registra o problema e deixa o equipamento em manutenção.
- Inativação passou a ser uma ação independente na lista de manutenções, com motivo e confirmação, preservando o histórico.
- Criada a etapa “Escolha o solicitante” antes de “Novo empréstimo” para a equipe. O formulário recebe o solicitante já selecionado e permite trocar de usuário.
- Versão do frontend/cache atualizada para `2026.11.06.3`.

## Validação

- `node --check` aprovado para todos os arquivos JavaScript do frontend.
- Não foram alterados contratos da API.
- A validação visual/ponta a ponta contra a API hospedada ainda depende de navegador e ambiente de produção.
