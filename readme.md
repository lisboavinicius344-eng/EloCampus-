# ELO Campus — Front-end integrado à API

Este repositório contém o front-end estático do ELO Campus. O navegador usa a API oficial por padrão; não há contas de demonstração, empréstimos fictícios ou base de dados de demonstração dentro da pasta servida pelo Nginx.

## O que está disponível

- Login real por e-mail, via `POST /auth/login`.
- Fluxo de senha provisória e troca obrigatória no primeiro acesso, conforme o contrato da API.
- Cadastro de alunos/docentes sem campo de senha.
- Telas públicas de acesso com visual próprio por etapa: entrar, criar conta, recuperar acesso e criar senha.
- Tela de recuperação de acesso com mensagem genérica para reduzir enumeração de contas.
- Aviso de privacidade público em `frontend/pages/privacidade.html`, marcado como versão preliminar até a instituição completar os dados de controlador/contato e aprovar os prazos/finalidades.
- Gestão de contas da equipe sem campos de senha e sem exibição de senhas provisórias.
- Token guardado em `sessionStorage`; a opção de lembrar guarda somente o e-mail, quando marcada.
- Chamadas da API com `cache: no-store`, tratamento de erros no campo `erro`, tratamento de sessão expirada e bloqueio obrigatório de troca de senha.
- “Lembrar meu e-mail” grava somente um endereço válido no `localStorage`, atualiza quando o campo é alterado e remove o valor quando a opção é desmarcada. Senha e token nunca são incluídos nessa preferência.
- Consulta QR Code mostra os campos do equipamento retornados pela API; quando a equipe está autenticada, solicita detalhes do empréstimo atual e histórico. Para visitantes e usuários comuns, respeita a resposta pública e não revela o nome do solicitante nem o histórico restrito.
- Telas de equipamentos, categorias, empréstimos, devoluções, reservas, manutenções, QR Code, histórico, solicitantes, usuários e painel.
- Docker/Nginx para servir somente os arquivos do front-end.

## Cadastro de solicitantes e criação de conta

O cadastro de **solicitante** é diferente da conta de login. A equipe deve primeiro abrir **Administração → Solicitantes**, criar o registro e entregar à pessoa o **código/ID que a API devolver**. Só então aluno ou professor usa a página pública `frontend/pages/cadastro.html`, informando nome, e-mail e esse `solicitante_id`; o backend valida se o registro existe, está ativo, tem tipo permitido e ainda não está vinculado a outra conta. O front-end não consulta a lista de solicitantes anonimamente, pois `GET /solicitantes` exige autenticação de equipe e expor a lista publicamente revelaria dados pessoais.

A gestão de solicitantes usa `GET/POST/PUT /solicitantes`, `GET /solicitantes/<id>` e `PATCH /solicitantes/<id>/desativar`. Admin e operador podem abrir a página; a gestão de contas (`/usuarios`) permanece exclusiva do admin. A desativação preserva o histórico e não equivale a apagar o registro.

## Recuperação de senha — dependência do back-end

A tela `frontend/pages/recuperar-senha.html` envia o e-mail para `POST /api/auth/esqueci-senha`. **Essa rota ainda não constava no API.md que foi fornecido para integração.** Se o servidor responder `404`/`405`, a tela explica que a recuperação automática ainda não está habilitada e orienta a solicitar o reenvio à administração.

O contrato de implementação e as exigências de segurança estão em [`docs/RECUPERACAO-SENHA-E-PRIVACIDADE.md`](docs/RECUPERACAO-SENHA-E-PRIVACIDADE.md). O back-end precisa implementar essa rota para que o envio de senha provisória ou instruções de redefinição funcione de ponta a ponta. A resposta pública deve ser genérica, independentemente de o e-mail existir.

## Privacidade e senhas

- O front-end não contém senhas de contas nem salva senhas digitadas.
- Tokens ficam em `sessionStorage` durante a sessão atual. Tokens legados encontrados em `localStorage` são removidos, não restaurados; usuários antigos precisarão entrar novamente. A opção “Lembrar meu e-mail” guarda apenas o e-mail quando marcada.
- “Lembrar meu e-mail” armazena apenas o endereço de e-mail, e somente se a pessoa marcar a opção.
- A tela da equipe não exibe `senha_provisoria`. A camada API remove campos de senha de objetos antes de entregá-los às telas.
- **Limitação importante:** o navegador não consegue ocultar um segredo que o próprio servidor envia no corpo HTTP: esse corpo pode ser inspecionado no DevTools. Para cumprir o requisito de não revelar senhas à administração, o back-end deve parar de devolver `senha_provisoria` nas respostas de criação/reenvio, inclusive quando falha o e-mail. O documento de privacidade detalha o ajuste.
- Essas medidas são melhorias técnicas, não uma declaração de conformidade jurídica completa com a LGPD. A instituição deve definir base legal/finalidade, aviso de privacidade, retenção, permissões, auditoria e resposta a incidentes.

## Executar no Windows sem Docker

1. Instale Python 3 se ainda não estiver instalado.
2. Abra o PowerShell na raiz do projeto.
3. Execute:

   ```powershell
   py -m http.server 8080 --directory frontend
   ```

4. Acesse `http://localhost:8080`. Para encerrar, pressione `Ctrl+C`.

A origem local (`http://localhost:8080`) precisa estar liberada em `CORS_ORIGINS` no back-end para chamadas à API. Se o CORS não estiver configurado, o navegador bloqueará as requisições mesmo que a API esteja funcionando.

## Docker

Pré-requisitos: Docker Engine/Desktop com `docker compose` disponível.

1. Copie `.env.example` para `.env`.
2. Na pasta que contém `Dockerfile` e `docker-compose.yml`, execute:

   ```powershell
   docker compose config
   docker compose up --build -d
   docker compose ps
   ```

3. Acesse `http://localhost:8080` (ou a porta definida por `ELO_PORT`).
4. Verifique o servidor estático em `http://localhost:8080/healthz`; a resposta esperada é `ok`.
5. Logs: `docker compose logs -f elo-campus-frontend`.
6. Encerramento: `docker compose down`.

O Compose inclui apenas o serviço estático do front-end. Não cria API nem banco de dados.

## Configuração da API

O endereço padrão é `https://elocampus-backend.a6ti6s.easypanel.host/api`. No Docker, ele pode ser sobrescrito por `ELO_API_BASE_URL` em `.env`. O modo de produção é fixado em `api`; a pasta servida não contém dados de demonstração nem credenciais fictícias.

## Atualizações de integração (28/10/2026)

- A navegação de autoatendimento usa **Reservar equipamento** e **Minhas reservas**; a devolução é operação da equipe no balcão.
- Incluídas as telas de **Reservas**, **Categorias** e **Manutenções**, conectadas às rotas de API documentadas.
- O cadastro/edição de equipamentos aceita uma categoria sugerida ou digitada. Se a categoria existir, envia `categoria_id`; se for nova, envia o nome para a API. Também envia `elegibilidade`. A API atual não armazena fotos; o formulário informa essa limitação.
- No fluxo de retirada da equipe, o solicitante é selecionado por ID, evitando correspondência frágil por nome.
- Páginas legadas de Relatórios e Saúde do Servidor, não usadas na navegação operacional, foram removidas do pacote.
- `runtime-config.js` tem versão identificada e o Nginx aplica `Cache-Control: no-store` para evitar manter a configuração de API em cache.
- As telas de autenticação mantêm diferenças discretas usando a paleta original (fundo escuro e acento ciano), sem cores chamativas fora da identidade visual.

### Limites e pré-requisitos

Estas telas chamam a API configurada em `assets/js/runtime-config.js`; operações só funcionarão se a API implantada expuser as rotas descritas e o usuário tiver o papel necessário. O front-end não substitui autorização no backend. A validação sintática dos arquivos JavaScript e a integridade do pacote são verificadas antes da entrega; a validação de ponta a ponta no Easypanel depende de registros e contas reais do ambiente.
