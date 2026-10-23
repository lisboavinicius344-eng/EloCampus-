/* ELO Campus — tela de cadastro de usuário (discente, docente ou servidor).
 * Depende de auth.js (cadastrarConta, obterSessao). No modo demo a conta é salva
 * neste navegador; com o backend conectado, troque cadastrarConta por uma chamada à API.
 */
"use strict";

(function inicializarCadastro() {
  const form = document.getElementById("cadastro-form");
  if (!form) return;

  if (obterSessao()) { window.location.replace("dashboard.html"); return; }

  const erro = document.getElementById("cadastro-erro");
  const botao = document.getElementById("cadastro-btn");
  const campos = ["nome", "email", "matricula", "usuario", "senha", "senha2"]
    .reduce((acc, id) => ({ ...acc, [id]: document.getElementById(id) }), {});
  const toggle = document.getElementById("senha-toggle");

  const marcar = (id, texto) => {
    const msg = document.getElementById(`${id}-erro`);
    msg.textContent = texto || "";
    campos[id].setAttribute("aria-invalid", texto ? "true" : "false");
  };

  toggle.addEventListener("click", () => {
    const mostrar = campos.senha.type === "password";
    campos.senha.type = campos.senha2.type = mostrar ? "text" : "password";
    toggle.textContent = mostrar ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(mostrar));
    toggle.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  });

  form.addEventListener("input", (e) => { if (e.target.id in campos) marcar(e.target.id, ""); });

  function validar() {
    const v = Object.fromEntries(Object.entries(campos).map(([k, el]) => [k, el.value.trim()]));
    const erros = {};
    if (v.nome.split(/\s+/).filter(Boolean).length < 2) erros.nome = "Informe nome e sobrenome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) erros.email = "Informe um e-mail válido.";
    if (v.matricula.length < 3) erros.matricula = "Informe sua matrícula.";
    if (!/^[a-z0-9._-]{3,}$/i.test(v.usuario)) erros.usuario = "Mínimo 3 caracteres: letras, números, ponto, hífen ou _.";
    else if (loginEmUso(v.usuario)) erros.usuario = "Este usuário já está em uso.";
    if (campos.senha.value.length < 6) erros.senha = "A senha deve ter ao menos 6 caracteres.";
    if (campos.senha2.value !== campos.senha.value) erros.senha2 = "As senhas não conferem.";
    return { v, erros };
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erro.hidden = true;
    const { v, erros } = validar();
    Object.keys(campos).forEach((id) => marcar(id, erros[id]));
    const primeiro = Object.keys(campos).find((id) => erros[id]);
    if (primeiro) { campos[primeiro].focus(); return; }

    botao.disabled = true;
    botao.textContent = "Criando conta…";
    try {
      await new Promise((r) => setTimeout(r, 250)); // latência visual da demonstração
      const perfil = form.querySelector('input[name="perfil"]:checked').value;
      cadastrarConta({
        login: v.usuario, senha: campos.senha.value, nome: v.nome, perfil,
        email: v.email, matricula: v.matricula,
      });
      try { sessionStorage.setItem("elo.cadastro.login", v.usuario); } catch { /* opcional */ }
      window.location.replace("../index.html?cadastro=ok");
    } catch (falha) {
      erro.textContent = falha.message || "Não foi possível criar a conta. Tente novamente.";
      erro.hidden = false;
      botao.disabled = false;
      botao.textContent = "Criar conta";
    }
  });
})();
