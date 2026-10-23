# ELO Campus — Front-end

Este repositório mantém a estrutura original da interface web em `frontend/`. As alterações desta etapa corrigem interações e apresentação dos dados no front-end sem implementar servidor de aplicação, API, banco de dados ou autenticação real.

## O que está disponível nesta etapa

- Telas originais, estilos e assets preservados.
- Cadastros e operações de demonstração usando o armazenamento local do navegador.
- Empréstimos com seleção de vários equipamentos, etapa de revisão e confirmação.
- Devoluções parciais por equipamento, com revisão e confirmação.
- Histórico de retiradas/devoluções e filtros por texto, tipo e período.
- Relatórios baseados nos registros carregados, filtros e exportação CSV.
- Consulta local por patrimônio, identificador ou URL codificada no QR Code.
- Tela de login com seleção explícita de acesso para Discente/Docente/Servidor ou Administração/TI, validada contra o perfil da conta de demonstração.
- Área de autoatendimento separada para discente, docente e servidor, com acesso direto a Ver os equipamentos, Pedir empréstimo, Devolver equipamentos e Consultar QR Code.
- A página Ver os equipamentos apresenta os itens disponíveis para empréstimo e pode abrir a solicitação com um item previamente selecionado. A consulta por QR Code também fica disponível para os perfis de autoatendimento.
- Empréstimos e devoluções dos usuários comuns mostram apenas registros vinculados à própria conta, com menos campos administrativos; páginas de gestão permanecem separadas.
- Contas de demonstração para administrador, operador, aluno, professor e servidor (perfil comum).
- Docker/Nginx para servir apenas arquivos estáticos do front-end.

**Importante:** os registros feitos nesta versão são locais a este navegador e não são dados oficiais nem são sincronizados entre dispositivos. A camada `api.js` preserva um ponto de integração futuro; o modo inicial continua sendo `demo`.

## Executar no Windows sem Docker

1. Instale o Node.js ou Python, se ainda não estiverem instalados.
2. Abra o PowerShell na pasta do projeto.
3. Execute um servidor estático apontando para `frontend`:

   ```powershell
   py -m http.server 8080 --directory frontend
   ```

4. Abra `http://localhost:8080` no navegador. Para encerrar, use `Ctrl+C` no PowerShell.

## Contas de demonstração

| Perfil | Usuário | Senha |
|---|---|---|
| Administrador (TI) | `admin` | `admin123` |
| Operador | `operador` | `operador123` |
| Aluno | `aluno` | `aluno123` |
| Professor | `professor` | `professor123` |
| Servidor (usuário comum) | `servidor` | `servidor123` |

Essas credenciais existem apenas para demonstrar a navegação por perfil. Não devem ser usadas em produção. A separação de telas e rotas é um controle de interface, não uma barreira de segurança: autenticação e autorização reais precisam ser aplicadas no back-end antes da publicação oficial.

## Docker

Pré-requisitos: Docker Engine/Desktop com o comando `docker compose` habilitado.

1. Copie `.env.example` para `.env`.
2. Na pasta que contém o `Dockerfile`, execute:

   ```powershell
   docker compose up --build -d
   ```

3. Abra `http://localhost:8080` (ou a porta definida por `ELO_PORT` no `.env`).
4. Verifique a disponibilidade do servidor em `http://localhost:8080/healthz` — a resposta deve ser `ok`.
5. Para consultar os registros de execução: `docker compose logs -f elo-campus-frontend`.
6. Para encerrar: `docker compose down`.

O Compose contém apenas o serviço web estático. Não cria API, servidor de aplicação, banco de dados ou serviços fictícios.

### Configuração para a futura API

O modo padrão é `ELO_DATA_MODE=demo`. Quando a API existir, configure `ELO_DATA_MODE=api` e `ELO_API_BASE_URL` no `.env`, usando, por exemplo, `/api` se o Nginx/API estiverem expostos na mesma origem. A aplicação não envia credenciais de servidor nem define endereços de produção no código. Alterar o modo para `api` antes da implementação da API fará as chamadas falharem explicitamente, como esperado.

Ao executar por um servidor estático fora do Docker, `frontend/assets/js/runtime-config.js` contém valores padrão de demonstração; ajuste esse arquivo somente quando estiver preparando a integração.

## Testes automatizados disponíveis

Com Node.js instalado, execute na raiz do repositório:

```powershell
node tests/test-local-data.cjs
node tests/test-login-auth.cjs
node tests/test-profile-routes.cjs
node tests/test-self-service.cjs
node tests/test-self-service-ui.cjs
node tests/test-ui-access.cjs
```

O primeiro teste verifica consulta de QR local, empréstimo com vários itens, prevenção de empréstimo duplicado/indisponível, devolução parcial/final, atualização do histórico, persistência após recriar a camada de dados e rollback em caso de falha de armazenamento. O segundo testa o login de demonstração, a correspondência entre área escolhida e perfil, e a rejeição de senhas incorretas. O terceiro testa a separação entre páginas administrativas e páginas de autoatendimento. O quarto testa empréstimos e devoluções no próprio cadastro e rejeita operações locais em nome de terceiros. O quinto verifica a estrutura própria do autoatendimento, o catálogo de disponíveis, os atalhos de solicitação, a consulta por QR Code e a simplificação de empréstimos. O sexto verifica os acessos de autoatendimento e a animação de desenho progressivo da logo vetorial no login.

## Relógio e horário das operações

Não há relógio ou temporizador permanente adicionado à interface. As operações registram a data e a hora local no momento em que o empréstimo ou a devolução são confirmados; esse horário aparece nos respectivos registros e no histórico. Sem uma referência confiável de servidor, uma aplicação exclusivamente front-end não consegue garantir a hora real se o relógio do dispositivo estiver incorreto, especialmente sem conexão.



## Integração com a API

O frontend usa por padrão a API publicada em `https://elocampus-backend.a6ti6s.easypanel.host/api`.
A configuração está em `frontend/assets/js/runtime-config.js`; variáveis injetadas pelo Docker têm prioridade.
Para desenvolvimento local, configure a origem do frontend em `CORS_ORIGINS` no backend. O modo demo pode ser reativado definindo `ELO_DATA_MODE` como `demo`.

A autenticação real usa e-mail e senha, armazena o token retornado pelo backend na sessão e envia `Authorization: Bearer` nas requisições. Erros JSON do backend são apresentados ao usuário; respostas 401 encerram a sessão. A API não oferece edição de perfil nem redefinição de senha no contrato atual, portanto essas ações não devem simular sucesso.


## Fluxo de senha provisória (API)

- O cadastro de aluno envia `nome`, `email` e `solicitante_id` para `POST /auth/cadastro-aluno`; o usuário não escolhe senha no cadastro.
- O login guarda o token e encaminha contas com `deve_trocar_senha: true` para `frontend/pages/trocar-senha.html`.
- A tela de primeiro acesso envia `senha_atual` e `nova_senha` para `POST /auth/trocar-senha`, mantendo o token existente após a troca.
- Respostas `403` com `codigo: TROCA_DE_SENHA_OBRIGATORIA` redirecionam para a tela de criação de senha.
- A tela de equipe usa `POST /usuarios` sem senha e oferece `PATCH /usuarios/:id/reenviar-senha`. Se o envio de e-mail falhar, a senha provisória retornada é mostrada na tela para repasse manual; ela não é armazenada pelo frontend.
- Esses endpoints só estarão disponíveis depois que o commit `8a32d99` for implantado no Easypanel. Antes disso, o frontend poderá receber erros por incompatibilidade com a versão antiga da API.
