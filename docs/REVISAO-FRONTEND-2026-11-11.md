

## Rodada adicional — versão `2026.11.11.2`

Nesta rodada foram integrados os contratos novos do backend. O dashboard administrativo agora apresenta, no topo, os botões **Cadastrar empréstimo** e **Registrar devolução**. Em cada empréstimo ativo da área “Empréstimos a acompanhar” há as ações **Devolver**, **Cobrar** e **Ver**; a cobrança exige confirmação explícita e usa `POST /emprestimos/<id>/cobrar`, exibindo a mensagem devolvida pela API. A mesma ação está disponível na página de empréstimos e no painel de detalhe.

O campo de vínculo do novo empréstimo passa a ser preenchido automaticamente conforme o tipo do solicitante e fica bloqueado: aluno → aluno, professor → professor, servidor/técnico → servidor e externo → grupo/setor. A lista exibe matrícula ou e-mail para usuários comuns e ID somente quando `sessao.master === true`.

Solicitações de acesso ganharam as abas **Pendentes** e **Histórico / Auditoria**. A aprovação aceita justificativa opcional, a recusa exige motivo e todas as ações permanecem sujeitas a confirmação. O perfil master passou a ter uma área separada para **Zerar dados operacionais**, protegida por confirmação dupla e pela digitação exata de `ZERAR DADOS`.

Para telas móveis, tabelas operacionais de empréstimos foram convertidas em cartões compactos; as demais tabelas permanecem com rolagem horizontal confinada ao próprio contêiner. Campos de texto, seleção e botões usam tamanho de fonte de 16 px em telas estreitas para evitar zoom automático do navegador e têm área mínima de toque. A validação realizada é estática e por sintaxe/regressão; a confirmação final em aparelhos físicos de 390 px ainda deve ser feita no dispositivo real.

As cores dos estados do dashboard foram separadas semanticamente: verde para disponível, azul para emprestado, vermelho para atraso, âmbar para manutenção e cinza para inativo, mantendo azul/rosa/roxo apenas como identidade visual.
