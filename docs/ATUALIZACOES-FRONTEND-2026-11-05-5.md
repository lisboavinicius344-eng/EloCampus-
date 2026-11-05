# Revisão geral do front-end — 05/11/2026 (revisão 5)

Base: ZIP `EloCampus--main (4).zip` recebido nesta conversa. A estrutura, os componentes e a identidade visual existentes foram preservados. Nenhuma alteração foi feita no repositório remoto.

## Correções desta revisão

- Corrigido o cálculo de prazo: datas futuras deixam de ser reduzidas a zero dias. A interface agora distingue `Vence hoje`, `Vence amanhã` e `Vence em N dias`; o atraso continua considerando o horário exato. Datas inválidas são identificadas como `Prazo não informado`.
- O painel do aluno usa a mesma classificação de prazo da lista de empréstimos, evitando rótulos divergentes.
- O relatório passou a contar atrasos pelo horário exato de vencimento, inclusive quando o prazo vence no próprio dia.
- Reforçado o bloqueio da página de devoluções para aluno, professor e servidor. A devolução permanece como procedimento da equipe do acervo.
- Corrigido o preenchimento do vínculo por parâmetro de URL no formulário de empréstimo/reserva: os valores agora correspondem às opções reais do `select`.
- Ajustada a área de vínculo Grupo ou setor para ocupar a largura do formulário sem compressão ou quebra indevida. Os dados de patrimônio, categoria e setor nos itens selecionados podem quebrar em pontos naturais sem alargar a página.
- Na tabela de solicitantes, somente a coluna ID permite quebra de linha; as demais colunas mantêm o conteúdo em uma linha e a tabela usa rolagem horizontal interna quando necessário.
- O zoom global é desativado em telas estreitas em todas as páginas que usam o CSS global, não apenas nas telas de empréstimos.
- Atualizados os parâmetros de versão dos recursos nas páginas para evitar cache antigo após a publicação.

## Verificações executadas

- `node --check` em todos os scripts JavaScript do frontend: aprovado.
- `node tests/api-contract-smoke.cjs`: aprovado, incluindo regressões para vencimento amanhã, em sete dias, ainda hoje e data inválida.
- Verificação de referências locais de scripts, estilos e páginas: nenhuma referência ausente.
- Verificação de IDs HTML duplicados: nenhum encontrado.
- Verificação estrutural de chaves dos arquivos CSS: aprovada.

## Limites da validação

Não foi possível executar navegador real, Docker ou testes ponta a ponta contra a API hospedada neste ambiente. Os fluxos que dependem de contas reais e da API devem ser confirmados no ambiente de homologação, especialmente login de aluno/professor, reserva, aprovação, retirada pela equipe e devolução administrativa.
