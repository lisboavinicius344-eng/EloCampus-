# ELO Campus — início do front-end

## Estrutura

- `index.html`: tela inicial de acesso.
- `assets/css/style.css`: identidade visual, layout e responsividade.
- `assets/js/login.js`: interações da tela (mostrar senha, mensagens de interface e validação nativa do formulário).
- `assets/img/elo-mark.svg`: marca vetorial provisória.
- `assets/img/login-illustration.svg`: ilustração vetorial provisória para a tela de acesso.

## Como abrir

Abra `index.html` no navegador. Os arquivos usam caminhos relativos, então a folha de estilos e o JavaScript funcionam também quando o arquivo é aberto diretamente.

## Estado da autenticação

A tela ainda não autentica usuários e não envia dados para nenhum servidor. O formulário exibe uma mensagem de aviso até ser integrado à API/backend. Não use credenciais reais nesta versão.

## Integração futura

A autenticação deverá ser implementada contra o endpoint acordado com a equipe responsável pelo backend. Não armazenar senhas no `localStorage` nem considerar a ocultação de elementos no front-end como controle de autorização.

## Imagens oficiais

Os SVGs em `assets/img` são provisórios e podem ser substituídos pelas imagens fornecidas para o projeto. Recomendações:

- Marca oficial: `assets/img/elo-mark.svg` (idealmente SVG com fundo transparente; PNG transparente também serve, mas será necessário ajustar o HTML).
- Ilustração da tela de acesso: `assets/img/login-illustration.svg` (SVG ou PNG/WebP de boa resolução).
- Ícone/fav icon, caso exista uma versão oficial diferente da marca.

As seis imagens do ZIP recebido são telas completas de referência visual, não imagens isoladas prontas para serem usadas como logo ou ilustração.
