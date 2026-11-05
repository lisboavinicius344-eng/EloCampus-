# Alterações do frontend — 04/11/2026

## Ajustes implementados
- Solicitação de acesso: vínculo `servidor` (Servidor/TAE) incluído na seleção e na validação.
- Perfil: ação de alteração de senha com maior destaque e confirmação antes da navegação.
- Revisão do pedido: botões com largura, alinhamento e quebra responsiva controlados.
- Detalhes do equipamento: consulta de histórico por `equipamento_id`, tratando a resposta como lista direta.
- Administração: ações de reativação adicionadas para usuários, solicitantes e categorias inativos.
- Cache-busting dos arquivos referenciados nas páginas atualizado para `2026.11.04.1`.

## Contratos de API
A cópia do projeto recebida não contém `docs/API.md`. Por isso, os métodos de reativação foram implementados seguindo o padrão dos endpoints de desativação já consumidos pelo frontend:
- `PATCH /usuarios/{id}/reativar`
- `PATCH /solicitantes/{id}/reativar`
- `PATCH /categorias/{id}/reativar`

Antes de publicar, confirme esses três caminhos e métodos no contrato da API implantada. O frontend exibe as ações somente quando o endpoint de listagem retorna registros inativos (`ativo: false`).

O histórico por equipamento consome:
- `GET /historico?equipamento_id={id}`
- Resposta esperada: array JSON direto (sem objeto intermediário).

## Validação local
Todos os arquivos JavaScript do frontend passaram pela verificação sintática do Node.js (`node --check`). Isso não substitui testes de integração com a API real nem testes visuais em navegador.
