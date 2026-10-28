# Integração da área de solicitantes

## Fluxo funcional implementado no front-end

1. Um administrador ou operador abre `pages/solicitantes.html` pelo menu **Administração → Solicitantes**.
2. A equipe cria o registro de solicitante pela API. A interface exibe o ID retornado pelo servidor.
3. A equipe entrega esse ID à pessoa de forma segura.
4. Aluno ou professor abre `pages/cadastro.html` e envia `nome`, `email` e `solicitante_id` para `POST /auth/cadastro-aluno`.
5. A API valida a associação e envia a senha provisória segundo seu fluxo de autenticação.

Não é feita busca pública de solicitantes no formulário de cadastro: o contrato fornecido protege `GET /solicitantes` para admin/operador. Fazer uma busca pública por nome/e-mail sem endpoint específico poderia expor dados pessoais. A interface informa o pré-requisito, valida o formato numérico do ID e apresenta a mensagem `erro` devolvida pela API.

## Contrato consumido

- `GET /solicitantes` → `{ "solicitantes": [...] }`
- `GET /solicitantes/<id>` → `{ "solicitante": {...} }`
- `POST /solicitantes` → `nome`, `tipo`, `setor`, `email`, `telefone`
- `PUT /solicitantes/<id>` → o mesmo corpo completo
- `PATCH /solicitantes/<id>/desativar` → desativa, preservando o histórico
- `POST /auth/cadastro-aluno` → `nome`, `email`, `solicitante_id`

Os tipos enviados pela interface seguem o `API.md` recebido: `aluno`, `professor`, `servidor`, `tecnico`, `externo`.

## Divergência no ZIP de back-end recebido

O arquivo `Elocampus-Backend2.0-main(1).zip` não contém a implementação das rotas Flask (não há `app.py`/módulos de rotas). Inclui `backend/requirements.txt`, front-end de protótipo e `elocampus_schema_revisado.sql`. Esse SQL declara que solicitantes não têm login e limita `solicitantes.tipo` ao conjunto `servidor`, `professor`, `funcionario`, `estudante`, `outro`. Isso diverge do `API.md` e do fluxo de `POST /auth/cadastro-aluno` usado pela aplicação atual.

Por isso, o front-end foi alinhado ao contrato de API documentado que foi fornecido na conversa, mas a criação real de solicitantes e contas só terá sucesso se o backend implantado implementar essas rotas e a base de dados aceitar o mesmo modelo e os mesmos valores. Se o EasyPanel ainda estiver executando a implementação antiga alinhada a esse SQL, a equipe de backend precisa harmonizar as rotas e a constraint de tipo; uma alteração apenas no front-end não consegue corrigir uma constraint no PostgreSQL.

## Privacidade

- A tela administrativa trata solicitantes como cadastros de identificação, não como contas e nunca contém campos de senha.
- A lista não é exposta a visitantes; a autorização no back-end continua obrigatória.
- A desativação chama o endpoint oficial e não usa exclusão local/fictícia.
