/* Solicitação de acesso institucional; a aprovação é feita pela administração. */
"use strict";

(() => {
  const form = document.getElementById("cadastro-form");
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const erro = $("cadastro-erro"), sucesso = $("cadastro-sucesso"), botao = $("cadastro-btn");
  const nome = $("nome"), email = $("email"), tipo = $("tipo"), matricula = $("matricula"), mensagem = $("mensagem");
  function mostrar(el, texto, tipoMensagem = "info") {
    el.textContent = texto;
    el.className = `alert ${tipoMensagem === "ok" ? "alert-ok" : tipoMensagem === "error" ? "alert-error" : "alert-info"}`;
    el.hidden = false;
  }
  form.addEventListener("submit", async (evento) => {
    evento.preventDefault(); erro.hidden = true; sucesso.hidden = true;
    const dados = { nome: nome.value.trim(), email: email.value.trim().toLowerCase(), tipo: tipo.value, matricula: matricula.value.trim(), mensagem: mensagem.value.trim() };
    if (dados.nome.split(/\s+/).filter(Boolean).length < 2) { mostrar(erro, "Informe seu nome completo.", "error"); nome.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) { mostrar(erro, "Informe um endereço de e-mail válido.", "error"); email.focus(); return; }
    if (!["aluno", "professor"].includes(dados.tipo)) { mostrar(erro, "Selecione Aluno ou Professor.", "error"); tipo.focus(); return; }
    if (typeof ELO === "undefined" || ELO.modo() !== "api") { mostrar(erro, "A solicitação de acesso exige conexão com a API.", "error"); return; }
    botao.disabled = true; botao.textContent = "Enviando solicitação…";
    try {
      const resposta = await ELO.solicitarAcesso(dados);
      mostrar(sucesso, resposta?.mensagem || "Sua solicitação foi recebida.", "ok");
      form.reset();
    } catch (falha) {
      mostrar(erro, falha.message || "Não foi possível enviar a solicitação. Tente novamente.", "error");
    } finally { botao.disabled = false; botao.textContent = "Solicitar acesso"; }
  });
})();
