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


## Ajustes complementares desta revisão

- Perfil: ação de salvar permanece como ação primária; alteração de senha ganhou estilo secundário destacado, separação visual e espaçamento próprio. A navegação continua condicionada à confirmação explícita.
- Novo empréstimo/reserva: a etapa de revisão agora usa duas colunas equilibradas em telas maiores, com ações de confirmar e voltar visualmente distintas; em telas estreitas, os botões ficam empilhados e ocupam a largura disponível.
- Reservas administrativas: a recusa já exige duas confirmações consecutivas antes de chamar `PATCH /reservas/{id}/rejeitar`; ambas as confirmações podem ser canceladas sem enviar a operação.
- Cadastro: o seletor de vínculo já contempla Aluno, Professor e Servidor (TAE), e a validação permite os três valores.
- Histórico do equipamento: o método `ELO.historicoEquipamento(id)` já chama `GET /historico?equipamento_id=...` e exige uma lista JSON direta.
- Reativação: as funções de API já estão declaradas para usuários, solicitantes e categorias. A disponibilidade visual depende de os scripts de gestão reconhecerem `ativo: false` na resposta da listagem e do backend implementar `PATCH /{recurso}/{id}/reativar`.
- Relatórios: mantido o cálculo e a exportação no front-end nesta versão. Não foi adicionada chamada a `/api/relatorios/resumo`, pois o pacote recebido não contém `docs/API.md` nem comprovação do contrato dessa rota. A migração deve ocorrer após confirmar caminho, formato de resposta, filtros e autorização no backend.
- QR Code: o formulário envia `qr_code` com o identificador digitado ou, por padrão, o patrimônio normalizado. O front-end leitor decodifica o conteúdo do QR e consulta `/consulta-qr/{codigo}`. A geração de uma imagem QR imprimível/etiqueta não está implementada neste pacote; é necessário confirmar se o backend gera/retorna a imagem ou adicionar geração no front-end sem alterar o identificador salvo.
- Cache: referências HTML atualizadas para `v=2026.11.04.3`.

## Limitações de validação

A revisão foi feita sobre o ZIP enviado. O repositório público consultado apresenta histórico visível até 28/10/2026; não foi possível obter o conteúdo mais recente diretamente do GitHub neste ambiente. A cópia recebida não contém `docs/API.md`. Portanto, contratos de endpoints que não estão documentados neste pacote permanecem pendentes de confirmação com o backend.
