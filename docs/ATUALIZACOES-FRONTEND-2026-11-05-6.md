# Revisão consolidada do frontend — 05/11/2026 (revisão 6)

## Correções desta revisão

- Consulta por QR Code: o erro retornado pela API é exibido em `#consulta-status`, com a classe `.qr-status.is-error`; o botão volta a `Consultar` no `finally`.
- Cache da consulta QR: as páginas pública e interna passaram a solicitar `qr.js?v=2026.11.05.6`, evitando que o navegador reutilize o script anterior.
- Prazos: `diasAtraso` agora preserva valores negativos para datas futuras. A tela mostra `Vence em 1 dia`, `Vence em 7 dias` etc.; somente o vencimento no dia corrente mostra `Vence hoje`. O vencimento considera o horário exato, inclusive quando o prazo vence hoje.
- Relatórios: contagem, ranking e CSV usam a mesma regra de vencimento por horário (`EloUtil.vencido`), incluindo atrasos que começam no próprio dia.
- Navegação: removidos os gradientes, sombras e cores especiais de seleção/hover acrescentados sem solicitação. A estrutura original dos itens de menu foi restaurada; os ajustes independentes de quebra de identificador na tabela de solicitantes foram preservados.
- Cache dos arquivos alterados nesta revisão atualizado para `2026.11.05.6` nas páginas correspondentes.

## Testes

Executar na raiz do projeto:

```bash
node tests/api-contract-smoke.cjs
node tests/frontend-regressions.cjs
```

O teste de regressão cobre vencimento hoje, amanhã, em sete dias, atraso no próprio dia, atraso desde ontem, data inválida e o tratamento de erro 404 do formulário QR (incluindo restauração do botão e cache das páginas pública/interna).

## Limites da validação

Os testes são automatizados e não substituem o teste visual em navegador com a API publicada. O comportamento final de consulta depende de a API responder o 404 com `{ "erro": "Nenhum equipamento corresponde a esse código." }`.
