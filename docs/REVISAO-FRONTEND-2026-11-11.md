# Revisão do frontend — ELO Campus

**Versão do frontend:** `2026.11.13.5`

## Correções realizadas

- Dashboard administrativo com ações rápidas operacionais: novo empréstimo, devolução, equipamentos, reservas e acompanhamento de atrasos.
- Alerta de destaque para empréstimos vencidos, com quantidade e acesso direto à lista filtrada.
- Ação direta de registro de devolução nos empréstimos exibidos no painel.
- ~~Remoção do botão de lembrete por e-mail~~ — revertido em `2026.11.13.5`: a cobrança tem endpoint ativo (ver abaixo).
- Fluxo de novo empréstimo com opção de vínculo `Outro`, campo obrigatório de explicação e inclusão da informação em `observacoes`.
- Tradução dos tipos de movimentação no histórico individual do equipamento e uso das observações quando disponíveis.
- Ocultação de identificadores internos nas interfaces comuns de QR público, categorias, reservas e solicitantes. A visualização permanece disponível somente para perfis master/administrador geral reconhecidos pelo frontend.
- Perfis `master`, `administrador_geral`, `administrador-geral` e `administrador_master` reconhecidos para navegação administrativa e auditoria.
- Cache-busting atualizado para `2026.11.11.1` em HTML, CSS e JavaScript.

## Recuperado em `2026.11.13.5` (removido por engano no commit `608d23b`, Teste-V6-(JC))

Restaurado a partir do commit `0168f22` (Teste-V4). O backend já oferece tudo isto:

- **Cobrança por e-mail:** `ELO.cobrarEmprestimo(id)` → `POST /emprestimos/{id}/cobrar` (sem corpo). Botão **Cobrar** na linha da tabela e no detalhe de Empréstimos, e no painel ao lado de “Registrar devolução” em “Empréstimos a acompanhar”. A API responde 400 se a pessoa foi cobrada há menos de 10 minutos ou não tem e-mail, e 503 se o envio falhar; a tela mostra a mensagem de erro.
- **Zerar dados operacionais:** `ELO.zerarDados(confirmacao)` → `POST /administracao/zerar-dados` com `{ "confirmacao": "ZERAR DADOS" }`. Área `#zona-master` no perfil, visível só quando `sessao.master === true`, com confirmação e digitação obrigatória de “ZERAR DADOS”.
- **Vínculo bloqueado:** no novo empréstimo, ao encontrar o solicitante o vínculo é preenchido a partir do cadastro e fica bloqueado; volta a ser editável quando o campo fica sem seleção.
- **Auditoria das solicitações de acesso:** responsável pela análise usa `analisado_por_nome` (o `analisado_por` é o ID do admin); data em `analisado_em`; justificativa em `justificativa` (na recusa, também `motivo_recusa`).

## Validação executada (versão `2026.11.11.1`)

- `node --check` em todos os arquivos JavaScript do frontend: **PASS**.
- `node tests/frontend-regressions.cjs`: **PASS**.
- `node tests/api-contract-smoke.cjs`: **PASS**.
- Verificação residual de `ID do sistema`, `senha_provisoria` e botão de lembrete no frontend: **sem ocorrências**.

A versão `2026.11.13.5` não passou por `node --check` nem pelos testes automatizados (Node indisponível no ambiente usado); validar no navegador após o deploy.

## Pendências que dependem do backend

Estas funcionalidades não foram simuladas no frontend:

- Geração assistida por IA de mensagens de e-mail; requer serviço/endpoint seguro no backend, sem chave exposta no navegador.
- Autorização real e filtragem de identificadores: o backend deve continuar impondo permissões e evitando o retorno indevido de IDs ou dados sensíveis.
- Garantia transacional entre abertura de manutenção, mudança para “Em manutenção” e eventual inativação.

A API continua sendo a autoridade para regras de negócio, permissões, estados, prazos e persistência.
