# ELO Campus
### Sistema de Gerenciamento de Empréstimos de Equipamentos

O **ELO Campus** é uma aplicação web desenvolvida para modernizar e organizar o gerenciamento de equipamentos e materiais utilizados no ambiente acadêmico. O sistema tem como objetivo facilitar o controle de empréstimos, devoluções, reservas e movimentações, proporcionando mais eficiência, transparência e organização aos processos institucionais.

O projeto foi desenvolvido com foco na praticidade, acessibilidade e facilidade de utilização, oferecendo interfaces específicas para usuários e administradores.

---

## Sobre o projeto

O ELO Campus foi idealizado para centralizar o gerenciamento do acervo de equipamentos, substituindo processos manuais por um ambiente digital integrado.

Por meio da plataforma, é possível consultar equipamentos disponíveis, realizar solicitações de empréstimo, acompanhar reservas, registrar devoluções e administrar as movimentações do acervo.

O sistema também utiliza identificação por QR Code, permitindo uma consulta mais rápida às informações dos equipamentos.

## Funcionalidades

### 1. Gerenciamento de equipamentos
- Cadastro e edição de equipamentos.
- Classificação por categorias e setores.
- Identificação individual por patrimônio.
- Inclusão de fotografias dos equipamentos.
- Controle de disponibilidade e situação.
- Consulta de informações por QR Code.

### 2. Empréstimos e devoluções
- Registro de novos empréstimos.
- Seleção de solicitantes e equipamentos.
- Definição de prazos de devolução.
- Confirmação das solicitações.
- Registro de retirada e devolução.
- Acompanhamento de empréstimos ativos e atrasados.
- Histórico de movimentações.

### 3. Reservas
- Solicitação de reserva de equipamentos.
- Acompanhamento das solicitações.
- Aprovação e recusa de reservas pela administração, com etapas de confirmação.
- Controle das situações das reservas.

### 4. Administração
- Gerenciamento de solicitantes e usuários.
- Controle da equipe do sistema.
- Gerenciamento de categorias e setores.
- Administração de equipamentos.
- Gerenciamento de manutenções.
- Histórico de movimentações.
- Relatórios e indicadores.
- Painel administrativo com informações gerais do acervo.

### 5. Acesso e autenticação
- Login de usuários.
- Solicitação de acesso à plataforma.
- Recuperação de senha.
- Edição de perfil.
- Controle de acesso conforme o tipo de usuário.
- Alteração obrigatória de senha no primeiro acesso, quando aplicável.

### 6. Consulta por QR Code
Cada equipamento pode possuir um QR Code individual, facilitando sua identificação e consulta de informações, como nome, patrimônio, categoria e disponibilidade, respeitando as permissões de acesso.

---

## Perfis de acesso

O sistema possui diferentes níveis de acesso, definidos conforme as responsabilidades de cada usuário.

| Perfil | Permissões principais |
|---|---|
| Administrador | Gerenciamento completo do sistema. |
| Operador | Gerenciamento operacional de equipamentos, empréstimos e devoluções. |
| Aluno | Consulta de equipamentos, reservas e acompanhamento dos próprios empréstimos. |
| Professor | Consulta de equipamentos, reservas e acompanhamento dos próprios empréstimos. |

As permissões são controladas pela integração com o backend.

## Tecnologias utilizadas

O projeto utiliza tecnologias voltadas ao desenvolvimento web e à integração entre interfaces e serviços de backend.

**Frontend**
- HTML5 — estrutura das páginas.
- CSS3 — estilização e responsividade.
- JavaScript — interatividade e funcionalidades.
- QR Code — identificação e consulta dos equipamentos.

**Backend e integração**
- API REST — comunicação entre frontend e backend.
- Autenticação por token Bearer.
- Integração com banco de dados por meio da API.
- Controle de permissões e validação de operações.

**Infraestrutura**
- Git e GitHub — versionamento e gerenciamento do código.
- Docker — conteinerização da aplicação.
- EasyPanel — gerenciamento da implantação e hospedagem.

---

## Estrutura do sistema

O projeto é organizado em módulos que separam as principais funcionalidades da aplicação:

```text
ELO-Campus/
│
├── assets/
│   ├── css/
│   ├── js/
│   ├── img/
│   └── icons/
│
├── pages/
│   ├── equipamentos/
│   ├── emprestimos/
│   ├── devolucoes/
│   ├── reservas/
│   ├── solicitantes/
│   ├── administracao/
│   └── ...
│
├── index.html
├── docker-compose.yml
├── Dockerfile
└── README.md
```

*A estrutura acima representa uma organização geral dos módulos. Os diretórios e arquivos devem corresponder à versão efetivamente presente no repositório.*

---

## Configuração e execução

### 1. Clonar o repositório

```bash
git clone https://github.com/lisboavinicius344-eng/EloCampus-.git
```

### 2. Acessar o diretório

```bash
cd EloCampus-
```

### 3. Configurar a API

O frontend utiliza um arquivo de configuração para definir o endereço do backend.

Arquivo:

```text
assets/js/runtime-config.js
```

Configuração:

```javascript
window.ELO_API_BASE_URL = "https://elocampus-backend.a6ti6s.easypanel.host/api";
window.ELO_DATA_MODE = "api";
```

O endereço deve corresponder à API disponível no ambiente de implantação.

### 4. Executar a aplicação

Caso utilize Docker e Docker Compose:

```bash
docker compose up -d --build
```

Após a inicialização, a aplicação deverá estar disponível no endereço configurado para o serviço.

---

## Integração com o Backend

O ELO Campus utiliza uma API REST para realizar operações de autenticação, gerenciamento de usuários, equipamentos, empréstimos, devoluções, reservas e demais funcionalidades.

A comunicação entre frontend e backend é realizada por requisições HTTP, utilizando os métodos apropriados para cada operação.

A autenticação utiliza tokens Bearer, permitindo que as requisições protegidas sejam associadas ao usuário autenticado.

O backend é responsável pelo processamento dos dados, validações, regras de negócio, persistência e controle de permissões.

---

## Implantação

A aplicação foi preparada para implantação em ambiente de servidor, utilizando Docker para facilitar a execução e o gerenciamento dos serviços.

A infraestrutura pode ser administrada pelo EasyPanel, permitindo configurar os serviços, variáveis de ambiente, domínios e comunicação entre frontend e backend.

É necessário garantir que:
- O frontend tenha acesso ao endereço da API.
- O backend esteja disponível e configurado corretamente.
- As origens do frontend estejam autorizadas nas configurações de CORS.
- Os serviços estejam utilizando HTTPS em produção.
- As configurações de acesso e autenticação estejam devidamente protegidas.

---

## Objetivos do projeto

O ELO Campus busca:

- Digitalizar o controle de empréstimos e devoluções.
- Facilitar a localização e identificação de equipamentos.
- Reduzir erros nos registros e movimentações.
- Melhorar o acompanhamento de reservas.
- Centralizar informações administrativas.
- Aumentar a transparência e a eficiência na gestão do acervo.

---

## Desenvolvimento

O projeto está em constante evolução, recebendo melhorias de interface, correções de funcionalidades e aperfeiçoamentos na integração com o backend.

Novas funcionalidades poderão ser incorporadas conforme as necessidades operacionais e institucionais.

---

## Projeto

**ELO Campus — Sistema de Gerenciamento de Empréstimos de Equipamentos**

Repositório oficial:

https://github.com/lisboavinicius344-eng/EloCampus-

**Desenvolvimento:** Projeto acadêmico e institucional.

