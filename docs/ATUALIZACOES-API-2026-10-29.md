# Atualizações de integração — 29/10/2026

## Fluxos atualizados
- Solicitação pública de acesso em `POST /api/auth/solicitar-acesso`, sem código do solicitante.
- Aprovação e recusa de pedidos na página administrativa `solicitacoes-acesso.html`; senha provisória só é mostrada se o envio de e-mail falhar e permanece apenas em memória na tela.
- IDs de usuários e solicitantes são tratados como texto; os IDs de equipamentos e registros operacionais continuam numéricos.
- Criação de senha envia somente `{ nova_senha }`, pois a senha provisória é consumida no primeiro login.
- Matrícula/SIAPE e `tem_conta` foram incorporados à gestão de solicitantes.
- Reservas: início futuro, até 30 dias de antecedência e duração máxima de 7 dias; status `expirada` é exibido.
- Empréstimos: prazo máximo de 15 dias; a interface faz uma checagem preventiva de atrasos, mantendo a API como autoridade final.
- Devolução aceita apenas `bom`, `regular` e `danificado`; manutenção pode ser aberta automaticamente pela API quando o estado informado for `danificado`.
- Finalização de manutenção envia `estado_conservacao` (`novo`, `bom` ou `regular`), com `bom` como padrão.
- Arquivos JavaScript e CSS locais recebem query string de versão `v=2026.10.29.2` para invalidar cache a cada deploy.

## Limitações de validação
Os testes locais não substituem a verificação contra a API real. Confirme o formato exato das respostas de `GET /solicitacoes-acesso`, os nomes dos campos de data da reserva e as permissões configuradas no servidor antes de publicar.
