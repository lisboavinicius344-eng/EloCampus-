/* Recuperação pública: nunca exibe se o e-mail existe nem qualquer senha. */
"use strict";
(() => {
  const form = document.getElementById("recuperar-form");
  if (!form) return;
  const email = document.getElementById("email-recuperacao");
  const botao = document.getElementById("recuperar-btn");
  const mensagem = document.getElementById("recuperacao-mensagem");
  const sucessoGenerico = "A solicitação foi recebida. Se houver uma conta ativa associada a esse e-mail e o serviço de envio estiver disponível, você receberá instruções. Confira a caixa de entrada e o spam; se nada chegar, procure a administração.";
  function informar(texto, tipo = "info") {
    mensagem.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "error" ? "alert-error" : "alert-info"}`;
    mensagem.textContent = texto;
    mensagem.hidden = false;
  }
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    mensagem.hidden = true;
    const endereco = email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) {
      informar("Informe um endereço de e-mail válido.", "error");
      email.focus();
      return;
    }
    botao.disabled = true;
    botao.textContent = "Enviando…";
    try {
      await ELO.solicitarRecuperacaoSenha(endereco);
      // Mensagem deliberadamente genérica para evitar enumeração de contas.
      informar(sucessoGenerico, "ok");
      form.reset();
    } catch (erro) {
      if (erro.status === 404 || erro.status === 405) {
        informar("A recuperação automática ainda não está habilitada no servidor. Entre em contato com a administração para solicitar novas instruções.", "error");
      } else if (erro.status === 429) {
        informar("Muitas tentativas em pouco tempo. Aguarde antes de solicitar novamente.", "error");
      } else if (!erro.status || erro.status >= 500) {
        informar("Não foi possível concluir a solicitação agora. Tente novamente mais tarde ou procure a administração.", "error");
      } else {
        // Não expor mensagens que possam confirmar se um e-mail está cadastrado.
        informar("Não foi possível confirmar a solicitação. Se não receber instruções, procure a administração.", "error");
      }
    } finally {
      botao.disabled = false;
      botao.textContent = "Enviar instruções";
    }
  });
})();
