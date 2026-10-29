# Revisão técnica do front-end — ELO Campus

**Versão:** `2026.10.29.2`  
**Base:** pacote `EloCampus--main` recebido em 29/10/2026.

## Correções consolidadas

- Removida a escolha de área no login. O perfil retornado por `POST /auth/login` define a navegação; os links de cadastro, recuperação de senha e consulta pública por QR Code foram preservados.
- Corrigida a normalização de empréstimos para exibir cada equipamento de um empréstimo múltiplo como item individual, mantendo separado o ID do empréstimo e o ID do equipamento.
- Corrigida a devolução para enviar os IDs do empréstimo e do equipamento selecionado, evitando que selecionar um item devolva automaticamente os demais itens do mesmo empréstimo.
- Normalizada a condição de devolução para os valores esperados pela API (`bom`, `regular`, `danificado`).
- Ajustados os totais do relatório para contar empréstimos distintos, mantendo os indicadores por equipamento no nível do item.
- A retirada efetiva do empréstimo administrativo é apresentada como registrada pelo servidor, pois o contrato da API não usa a data local escolhida no formulário como data efetiva de retirada.
- O perfil foi tornado somente leitura até que exista uma rota de API para salvar alterações. A troca de senha continua disponível.
- Corrigidos textos de estado vazio e confirmação que ainda mencionavam gravação local, apesar de a aplicação usar a API.
- Criado um ícone específico para categorias, corrigido o destino de fallback do link de edição de equipamento e removido um script legado não utilizado que simulava operações.
- Removido `container_name` fixo do Docker Compose para reduzir conflitos com contêineres antigos.
- Atualizada a versão dos recursos para `2026.10.29.2`.

## Verificações executadas

- Sintaxe de todos os arquivos JavaScript com `node --check`.
- Integridade das referências locais de HTML, scripts e assets CSS.
- Verificação de IDs HTML duplicados.
- Teste automatizado da normalização de um empréstimo com dois equipamentos.
- Teste automatizado de devolução de apenas um item, incluindo o valor de condição enviado à API.
- Teste automatizado de consulta QR Code verificando que usuários comuns não enviam token para o endpoint público e que a equipe autenticada pode solicitar detalhes restritos.
- Testes de integração simulada para solicitação de acesso, preservação de matrícula com zeros à esquerda, IDs UUID como texto e sanitização da senha provisória.
- Para repetir os testes: `node tests/api-contract-smoke.cjs` (requer Node.js, sem dependências externas).

## Dependências ainda externas ao front-end

- A recuperação automática de senha continua dependendo da rota de recuperação configurada no backend.
- A edição persistente do perfil depende de uma rota de API ainda não documentada.
- O backend deve validar todos os papéis e permissões; as restrições no front-end são apenas de navegação.
- A instituição precisa confirmar as regras de privacidade, retenção e tratamento de dados antes de considerar o aviso de privacidade definitivo.

## Validação que ainda precisa ocorrer no ambiente real

Não foi possível executar o Docker nem realizar teste visual de navegador ou teste ponta a ponta contra a API hospedada neste ambiente. Antes da publicação, testar login com cada papel, cadastro e primeiro acesso, criação de equipamento/categoria, empréstimo com mais de um item, devolução parcial e total, reservas, manutenção, consulta pública e autenticada por QR Code, filtros e expiração de sessão.
