"use strict";
(() => {
  const msg = document.getElementById("api-health-message");
  const badge = document.getElementById("api-health-badge");
  const nome = document.getElementById("api-health-name");
  const horario = document.getElementById("api-health-time");
  const botao = document.getElementById("api-health-refresh");
  if (!msg || !badge || !nome || !horario || !botao) return;
  async function verificar() {
    botao.disabled = true;
    botao.textContent = "Verificando…";
    msg.className = "alert alert-info";
    msg.textContent = "Consultando o endpoint público de saúde da API…";
    badge.className = "badge";
    badge.textContent = "Consultando";
    try {
      const resultado = await ELO.verificarSaude();
      const ok = String(resultado?.status || "").toLowerCase() === "ok";
      badge.className = `badge ${ok ? "badge-ok" : "badge-late"}`;
      badge.textContent = ok ? "Disponível" : "Resposta inesperada";
      nome.textContent = resultado?.sistema || "API do ELO Campus";
      msg.className = `alert ${ok ? "alert-ok" : "alert-info"}`;
      msg.textContent = ok ? "A API respondeu à verificação de saúde. Isso não garante que todas as operações estejam disponíveis." : "A API respondeu, mas o status não corresponde ao esperado.";
    } catch (erro) {
      badge.className = "badge badge-late";
      badge.textContent = "Indisponível";
      nome.textContent = "API do ELO Campus";
      msg.className = "alert alert-error";
      msg.textContent = "Não foi possível confirmar a disponibilidade da API. Verifique a conexão e os registros do serviço.";
    } finally {
      horario.textContent = new Date().toLocaleString("pt-BR");
      botao.disabled = false;
      botao.textContent = "Verificar novamente";
    }
  }
  botao.addEventListener("click", verificar);
  verificar();
})();
