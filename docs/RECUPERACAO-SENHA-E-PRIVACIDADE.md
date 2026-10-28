# ELO Campus — recuperação de senha e proteção de credenciais

## Estado da integração

O frontend oferece `POST /auth/esqueci-senha` como contrato esperado para recuperação pública. Essa rota **não estava documentada no API.md fornecido até o momento**. Se a API responder 404/405, a página informa que a recuperação autônoma ainda não está habilitada e orienta a procurar a administração. Não se deve simular um e-mail enviado.

## Contrato recomendado para `POST /api/auth/esqueci-senha`

Requisição pública:

```json
{ "email": "pessoa@instituicao.edu.br" }
```

Resposta 200 genérica, igual tanto para endereço existente como inexistente:

```json
{ "mensagem": "Se houver uma conta ativa associada a esse e-mail, enviaremos as instruções de recuperação." }
```

Para compatibilidade com o fluxo de primeiro acesso existente, o backend pode gerar uma nova senha provisória aleatória, armazenar somente seu hash, marcá-la para troca obrigatória e enviá-la ao endereço cadastrado. A validade deve ser limitada (por exemplo, 24 horas), invalidando a credencial provisória anterior. Alternativamente, prefira um link de redefinição de uso único e curto prazo. Em ambos os casos:

- A resposta pública não pode confirmar se o endereço tem conta, nem devolver senha/token de recuperação.
- Aplicar limitação de tentativas por IP/e-mail, expiração, uso único e auditoria sem registrar segredos.
- Não incluir a senha provisória em resposta HTTP de nenhuma rota administrativa, inclusive quando o envio de e-mail falhar.
- Quando o e-mail falhar, retornar somente `email_enviado: false` e uma mensagem operacional; a equipe corrige o serviço de e-mail e aciona um novo envio. O administrador não deve receber a senha.
- Enviar `Cache-Control: no-store` em respostas de autenticação/conta e nunca escrever senhas, tokens, corpo de autenticação ou links de recuperação em logs.

## Proteções implementadas no frontend

- Login envia e-mail/senha somente para a API por HTTPS; não existe fallback de contas de demonstração.
- Tokens novos ficam em `sessionStorage`, não em `localStorage`. A caixa “Lembrar meu e-mail” armazena apenas o e-mail quando marcada; nunca guarda a senha.
- A camada da API usa `cache: no-store`, não persiste dados retornados e remove chaves de senha antes de expor objetos ao código das páginas.
- A tela de equipe nunca renderiza `senha_provisoria`, mesmo que a resposta da API contenha esse campo.
- A tela pública de recuperação usa mensagem genérica para reduzir enumeração de contas.
- Os dados e scripts de demonstração foram removidos da pasta servida pelo Nginx; o fixture usado por testes foi movido para `tests/fixtures`.

## Limite que exige correção no backend

O frontend não consegue ocultar um segredo que o próprio backend envia na resposta HTTP: uma pessoa com acesso ao navegador pode inspecionar Network/DevTools. Para cumprir o requisito de não revelar senhas à administração, o backend precisa **parar de retornar `senha_provisoria` em respostas a usuários administrativos**, inclusive em falhas de e-mail. A sanitização do frontend é uma defesa adicional contra exibição acidental, não substitui essa correção.

## Aviso público de privacidade

A página `frontend/pages/privacidade.html` apresenta um aviso preliminar em linguagem simples e está ligada às telas públicas de login/cadastro/recuperação. Os campos do controlador, canal de privacidade e prazo de retenção permanecem explicitamente pendentes; a instituição deve preenchê-los e aprovar o texto antes do uso oficial. O aviso também descreve a dependência externa de Google Fonts, pois há páginas que solicitam fontes a esse serviço.

## Observação de LGPD

Estas medidas são melhorias técnicas de minimização e segurança, não uma declaração de conformidade jurídica integral com a LGPD. O responsável pelo tratamento deve definir finalidade/base legal, aviso de privacidade, retenção e descarte, controles de acesso, resposta a incidentes e registros de auditoria com a instituição.
