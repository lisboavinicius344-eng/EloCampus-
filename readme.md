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
- Contas de demonstração para administrador, operador, aluno e professor.
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

Essas credenciais existem apenas para demonstrar a navegação por perfil. Não devem ser usadas em produção.

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
```

O teste verifica consulta de QR local, empréstimo com vários itens, prevenção de empréstimo duplicado/indisponível, devolução parcial/final, atualização do histórico, persistência após recriar a camada de dados e rollback em caso de falha de armazenamento.

## Relógio e horário das operações

Não há relógio ou temporizador permanente adicionado à interface. As operações registram a data e a hora local no momento em que o empréstimo ou a devolução são confirmados; esse horário aparece nos respectivos registros e no histórico. Sem uma referência confiável de servidor, uma aplicação exclusivamente front-end não consegue garantir a hora real se o relógio do dispositivo estiver incorreto, especialmente sem conexão.
