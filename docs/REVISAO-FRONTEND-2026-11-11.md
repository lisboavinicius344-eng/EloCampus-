# Revisão do frontend — ELO Campus

**Versão do frontend:** `2026.11.11.1`

## Correções realizadas

- Dashboard administrativo com ações rápidas operacionais: novo empréstimo, devolução, equipamentos, reservas e acompanhamento de atrasos.
- Alerta de destaque para empréstimos vencidos, com quantidade e acesso direto à lista filtrada.
- Ação direta de registro de devolução nos empréstimos exibidos no painel.
- Remoção do botão de lembrete por e-mail que não possuía endpoint/listener funcional.
- Fluxo de novo empréstimo com opção de vínculo `Outro`, campo obrigatório de explicação e inclusão da informação em `observacoes`.
- Tradução dos tipos de movimentação no histórico individual do equipamento e uso das observações quando disponíveis.
- Ocultação de identificadores internos nas interfaces comuns de QR público, categorias, reservas e solicitantes. A visualização permanece disponível somente para perfis master/administrador geral reconhecidos pelo frontend.
- Perfis `master`, `administrador_geral`, `administrador-geral` e `administrador_master` reconhecidos para navegação administrativa e auditoria.
- Cache-busting atualizado para `2026.11.11.1` em HTML, CSS e JavaScript.

## Validação executada

- `node --check` em todos os arquivos JavaScript do frontend: **PASS**.
- `node tests/frontend-regressions.cjs`: **PASS**.
- `node tests/api-contract-smoke.cjs`: **PASS**.
- Verificação residual de `ID do sistema`, `senha_provisoria` e botão de lembrete no frontend: **sem ocorrências**.

## Pendências que dependem do backend

Estas funcionalidades não foram simuladas no frontend:

- Auditoria histórica de aprovações/recusas, incluindo responsável, data/hora e justificativa, caso esses campos ainda não sejam retornados pela API.
- Envio de cobranças e notificações de devolução; requer endpoint real e confirmação de idempotência.
- Geração assistida por IA de mensagens de e-mail; requer serviço/endpoint seguro no backend, sem chave exposta no navegador.
- Autorização real e filtragem de identificadores: o backend deve continuar impondo permissões e evitando o retorno indevido de IDs ou dados sensíveis.
- Garantia transacional entre abertura de manutenção, mudança para “Em manutenção” e eventual inativação.

A API continua sendo a autoridade para regras de negócio, permissões, estados, prazos e persistência.
