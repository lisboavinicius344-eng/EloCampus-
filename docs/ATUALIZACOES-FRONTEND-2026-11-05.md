# Atualizações do front-end — 05/11/2026

Base: branch `main`, commit `7c84e4c`.

## Reservas do usuário
- A listagem resolve nomes de equipamentos a partir dos dados aninhados ou dos IDs, consultando o catálogo como fallback.
- Reservas aprovadas aparecem antes das demais e exibem o período de retirada (início da janela: duas horas antes de `data_inicio`, até `data_fim`).
- Reservas encerradas, canceladas, rejeitadas ou expiradas podem iniciar uma nova solicitação com os equipamentos anteriores pré-selecionados.

## Dashboard do usuário
- Aluno, professor e servidor consultam reservas junto dos demais dados.
- Falha na consulta de reservas não impede o carregamento do restante do dashboard.
- Avisos de reservas aprovadas são exibidos em ordem cronológica e deixam de aparecer quando o status deixa de ser `aprovada`.

## Empréstimos e devoluções
- A página `devolucoes.html` foi incluída na lista de páginas permitidas aos perfis finais. Isso corrige o redirecionamento indevido ao painel ao abrir uma devolução pré-preenchida a partir de “Meus empréstimos”.
- Textos de autoatendimento foram padronizados para “Reservar”.
- A tabela de equipe reconhece os perfis aluno, professor e servidor/TAE sem alterar permissões.

## Integração
- Nenhuma rota nova foi criada ou presumida. As alterações usam as funções existentes `ELO.reservas()`, `ELO.equipamentos()`, `ELO.emprestimos()`, `ELO.criarReserva()` e `ELO.registrarDevolucao()`.
