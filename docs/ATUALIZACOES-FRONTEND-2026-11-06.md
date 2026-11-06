# Atualizações do frontend — 06/11/2026

- Corrigida a diferença assinada de dias no prazo: datas futuras preservam dias restantes; o atraso continua considerando o horário exato.
- Reorganizada a tela Novo empréstimo/Reservar equipamento com grade estável, botões alinhados e adaptação para celular, preservando os componentes e a identidade visual existentes.
- Aumentado o espaçamento entre filtro e botão Atualizar na listagem de reservas, tanto na visão do aluno quanto na administração.
- Unificada a cor de destaque do dashboard em tons de roxo, evitando os acentos rosa e azul divergentes.
- A lista administrativa de empréstimos agora mantém o item selecionado destacado e apresenta resposta visual suave ao passar o mouse.
- A inativação em Manutenções passou a ser opcional no momento da abertura; por padrão, enviar um equipamento para manutenção não o inativa. A abertura mantém duas confirmações e a inativação exige motivo e confirmação explícita.
- Ampliada moderadamente a coluna de ID em Solicitantes, evitando quebra excessiva.
- Atualizadas as versões de cache dos recursos locais.

A inativação usa o endpoint já disponível `PATCH /equipamentos/{id}/inativar`. A abertura da manutenção e a inativação são duas operações da API; se a segunda falhar, a manutenção permanece aberta e a mensagem orienta a concluir a inativação pela tela de Equipamentos.
