/* Cadastro de aluno com senha provisória enviada pelo backend. */
"use strict";

(function inicializarCadastro() {
  const form = document.getElementById("cadastro-form");
  if (!form) return;

  const erro = document.getElementById("cadastro-erro");
  const sucesso = document.getElementById("cadastro-sucesso");
  const botao = document.getElementById("cadastro-btn");
  const nome = document.getElementById("nome");
  const email = document.getElementById("email");
  const solicitanteId = document.getElementById("solicitante_id");

  const mostrar = (el, texto, tipo) => {
    el.textContent = texto;
    el.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "info" ? "alert-info" : "alert-error"}`;
    el.hidden = false;
  };

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erro.hidden = true;
    sucesso.hidden = true;
    const dados = {
      nome: nome.value.trim(),
      email: email.value.trim().toLowerCase(),
      solicitante_id: /^\d+$/.test(solicitanteId.value.trim()) ? Number(solicitanteId.value.trim()) : NaN
    };
    if (dados.nome.split(/\s+/).filter(Boolean).length < 2) {
      mostrar(erro, "Informe seu nome completo."); nome.focus(); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      mostrar(erro, "Informe um endereço de e-mail válido."); email.focus(); return;
    }
    if (!Number.isSafeInteger(dados.solicitante_id) || dados.solicitante_id < 1) {
      mostrar(erro, "Informe um código de solicitante válido."); solicitanteId.focus(); return;
    }
    if (typeof ELO === "undefined" || ELO.modo() !== "api") {
      mostrar(erro, "O cadastro por e-mail está disponível quando o site está conectado à API.");
      return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando solicitação…";
    try {
      const resposta = await ELO.cadastroAluno(dados);
      const mensagem = resposta?.mensagem || resposta?.message || "Enviamos uma senha provisória para o seu e-mail.";
      if (resposta?.email_enviado === false) {
        mostrar(sucesso, `${mensagem} Sua conta foi criada, mas o e-mail não foi enviado. Procure a administração para receber a senha provisória.`, "info");
      } else {
        mostrar(sucesso, mensagem, "ok");
      }
      form.reset();
    } catch (falha) {
      mostrar(erro, falha.message || "Não foi possível concluir o cadastro. Tente novamente.");
    } finally {
      botao.disabled = false;
      botao.textContent = "Solicitar acesso";
    }
  });
})();
