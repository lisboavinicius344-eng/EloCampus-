/* ELO Campus — autenticação institucional. Senhas nunca são persistidas no navegador. */
"use strict";

const SESSION_KEY = "elo.sessao";
const REMEMBER_EMAIL_KEY = "elo.login.salvo";
const DASHBOARD_URL = "pages/dashboard.html";
const PERFIS_VALIDOS = new Set(["administrador", "operador", "aluno", "professor"]);

function obterBaseApiAuth() {
  return String(window.ELO_API_BASE_URL || "").replace(/\/+$/, "");
}

async function autenticar(email, senha) {
  const base = obterBaseApiAuth();
  if (!base) throw new Error("O serviço de autenticação não está configurado. Procure a equipe técnica.");
  let resposta;
  try {
    resposta = await fetch(`${base}/auth/login`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(email || "").trim().toLowerCase(), senha }),
      cache: "no-store",
      credentials: "omit",
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");
  }
  const corpo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(resposta.status === 500 ? "Ocorreu um erro interno. Tente novamente em instantes." : (corpo.erro || corpo.mensagem || "Não foi possível entrar. Confira suas credenciais e tente novamente."));
    erro.status = resposta.status;
    erro.codigo = corpo.codigo;
    throw erro;
  }
  const usuarioBruto = corpo.usuario || {};
  const chavesSecretas = new Set(["senha", "senhaprovisoria", "senhaatual", "novasenha", "password", "temporarypassword", "passwordhash", "senhahash", "token", "accesstoken", "refreshtoken", "resettoken", "tokenrecuperacao"]);
  const limparCamposSecretos = (valor) => {
    if (Array.isArray(valor)) return valor.map(limparCamposSecretos);
    if (!valor || typeof valor !== "object") return valor;
    return Object.fromEntries(Object.entries(valor)
      .filter(([chave]) => !chavesSecretas.has(String(chave).toLowerCase().replace(/[_\s-]/g, "")))
      .map(([chave, conteudo]) => [chave, limparCamposSecretos(conteudo)]));
  };
  const usuario = limparCamposSecretos(usuarioBruto);
  const papelApi = String(usuario.papel || usuario.perfil || "").toLowerCase();
  const perfil = ({ admin: "administrador", administrador: "administrador", operador: "operador", aluno: "aluno", professor: "professor" })[papelApi];
  if (!corpo.token || !usuario.id || !perfil) throw new Error("A resposta de autenticação do servidor está incompleta. Procure a equipe técnica.");
  return {
    ...usuario,
    usuario,
    perfil,
    login: usuario.email,
    token: corpo.token,
    nome: usuario.nome,
    solicitante_id: usuario.solicitante_id,
    deve_trocar_senha: Boolean(usuario.deve_trocar_senha),
  };
}

// Tokens ficam apenas na sessão atual do navegador, nunca em localStorage.
function salvarSessao(sessao) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
  try { localStorage.removeItem(SESSION_KEY); } catch { /* armazenamento local pode estar bloqueado */ }
}

function obterSessao() {
  try {
    const atual = sessionStorage.getItem(SESSION_KEY);
    if (atual) return JSON.parse(atual);
  } catch {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  }
  // Tokens persistidos por versões antigas são invalidados e removidos, nunca restaurados.
  try { localStorage.removeItem(SESSION_KEY); } catch { /* armazenamento local pode estar bloqueado */ }
  return null;
}

function limparSessao() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
  try { localStorage.removeItem(SESSION_KEY); } catch { /* noop */ }
}

function sair() {
  limparSessao();
  const caminho = window.location.pathname.includes("/pages/") ? "../index.html" : "index.html";
  window.location.href = caminho;
}

(function inicializarLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const erro = document.getElementById("login-erro");
  const botao = document.getElementById("login-btn");
  const login = document.getElementById("login");
  const senha = document.getElementById("senha");
  const toggle = document.getElementById("senha-toggle");
  const lembrarEmail = document.getElementById("lembrar");

  login.type = "email";
  login.autocomplete = "username";
  login.placeholder = "voce@instituicao.edu.br";
  const label = form.querySelector('label[for="login"]');
  if (label) label.textContent = "E-mail institucional";
  const cartaoLogin = form.closest?.(".card");
  const cabecalho = cartaoLogin?.querySelector(".card-head p");
  if (cabecalho) cabecalho.textContent = "Entre com seu e-mail institucional e sua senha.";
  const notaLogin = document.querySelector(".login-note");
  if (notaLogin) notaLogin.textContent = "No primeiro acesso, use a senha provisória recebida por e-mail e crie sua senha pessoal.";

  const mostrarMensagem = (texto, tipo = "error") => {
    erro.textContent = texto;
    erro.className = `alert ${tipo === "info" ? "alert-info" : tipo === "ok" ? "alert-ok" : "alert-error"}`;
    erro.hidden = false;
  };

  const parametros = new URLSearchParams(window.location.search);
  if (parametros.get("sessao") === "expirada") mostrarMensagem("Sua sessão expirou. Entre novamente.", "info");
  if (parametros.get("cadastro") === "ok") mostrarMensagem("Solicitação recebida. Confira seu e-mail para obter a senha provisória.", "ok");
  if (["sessao", "cadastro"].some((chave) => parametros.has(chave))) window.history.replaceState(null, "", window.location.pathname);

  const sessaoAtual = obterSessao();
  if (sessaoAtual && PERFIS_VALIDOS.has(String(sessaoAtual.perfil || "").toLowerCase())) {
    window.location.replace(sessaoAtual.deve_trocar_senha ? "pages/trocar-senha.html" : DASHBOARD_URL);
    return;
  }
  if (sessaoAtual) limparSessao();

  try {
    const emailSalvo = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (emailSalvo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSalvo)) {
      login.value = emailSalvo;
      lembrarEmail.checked = true;
    } else if (emailSalvo) {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  } catch { /* a tela continua disponível se o armazenamento estiver bloqueado */ }

  // Guarda somente o endereço de e-mail, nunca a senha ou o token.
  const persistirEmailLembrado = () => {
    try {
      if (!lembrarEmail.checked) {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
        return;
      }
      const endereco = login.value.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(endereco)) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, endereco);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch { /* recurso opcional: o login não depende do armazenamento local */ }
  };
  lembrarEmail.addEventListener("change", persistirEmailLembrado);
  login.addEventListener("input", () => { if (lembrarEmail.checked) persistirEmailLembrado(); });
  login.addEventListener("blur", persistirEmailLembrado);

  toggle?.addEventListener("click", () => {
    const mostrar = senha.type === "password";
    senha.type = mostrar ? "text" : "password";
    toggle.textContent = mostrar ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(mostrar));
    toggle.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    senha.focus({ preventScroll: true });
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erro.hidden = true;
    const email = login.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      mostrarMensagem("Informe um endereço de e-mail válido.");
      login.focus();
      return;
    }
    if (!senha.value) {
      mostrarMensagem("Informe sua senha.");
      senha.focus();
      return;
    }

    botao.disabled = true;
    botao.textContent = "Verificando…";
    try {
      const sessao = await autenticar(email, senha.value);
      if (!PERFIS_VALIDOS.has(String(sessao.perfil || "").toLowerCase())) {
        throw new Error("O perfil vinculado à conta não é reconhecido. Procure a equipe responsável.");
      }

      const areaEscolhida = form.querySelector('input[name="tipo-acesso"]:checked')?.value || "usuario";
      const perfil = String(sessao.perfil || "").toLowerCase();
      const perfilAdministrativo = perfil === "administrador" || perfil === "operador";
      if (areaEscolhida === "administracao" && !perfilAdministrativo) {
        throw new Error("Esta conta não possui perfil administrativo. Selecione “Aluno ou professor” para entrar.");
      }
      if (areaEscolhida === "usuario" && perfilAdministrativo) {
        throw new Error("Esta conta pertence à área administrativa. Selecione “Administrador / TI” para continuar.");
      }

      salvarSessao(sessao);
      persistirEmailLembrado();
      senha.value = "";
      window.location.replace(sessao.deve_trocar_senha ? "pages/trocar-senha.html" : DASHBOARD_URL);
    } catch (falha) {
      mostrarMensagem(falha.message || "Não foi possível entrar. Tente novamente.");
      botao.disabled = false;
      botao.textContent = "Entrar";
      senha.value = "";
      senha.focus();
    }
  });
})();
