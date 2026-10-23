/* ELO Campus — autenticação de demonstração e gestão da sessão local.
 * A validação real deve ser fornecida pelo backend/API. Os perfis abaixo são
 * apenas contas locais para demonstrar a navegação enquanto essa integração não existe.
 */
"use strict";

const AUTH_MODE = String(window.ELO_DATA_MODE || "demo").toLowerCase() === "api" ? "api" : "demo";
const SESSION_KEY = "elo.sessao";
const REMEMBER_KEY = "elo.sessao.lembrar";
const DASHBOARD_URL = "pages/dashboard.html";
const PERFIS_VALIDOS = new Set(["administrador", "operador", "aluno", "professor", "servidor"]);
const PERFIS_EQUIPE = new Set(["administrador", "operador"]);
const PERFIS_USUARIO = new Set(["aluno", "professor", "servidor"]);

const CONTAS_DEMO = [
  { login: "admin", senha: "admin123", nome: "Administrador", perfil: "administrador", email: "admin@instituicao.edu.br", telefone: "(77) 99999-0000", matricula: "ADM-0001", setor: "Direção", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "operador", senha: "operador123", nome: "Operador", perfil: "operador", email: "operador@instituicao.edu.br", telefone: "(77) 98888-1111", matricula: "SRV-0024", setor: "Coordenação de TI", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "aluno", senha: "aluno123", nome: "Mariana Costa", perfil: "aluno", email: "mariana@lapa.edu.br", matricula: "2024118", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "professor", senha: "professor123", nome: "Prof. Ricardo Alves", perfil: "professor", email: "ricardo.alves@lapa.edu.br", matricula: "SIAPE 1048873", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "servidor", senha: "servidor123", nome: "Servidor de demonstração", perfil: "servidor", email: "servidor@lapa.edu.br", matricula: "SRV-DEMO-01", setor: "Campus Lapa", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
];

const CONTAS_KEY = "elo.contas.cadastradas";

// Contas criadas na tela de cadastro (somente demonstração, salvas neste navegador).
// Com o backend conectado, o cadastro deve ser enviado à API e este armazenamento removido.
function contasCadastradas() {
  try {
    const lista = JSON.parse(localStorage.getItem(CONTAS_KEY) || "[]");
    return Array.isArray(lista) ? lista : [];
  } catch { return []; }
}

function loginEmUso(login) {
  const alvo = String(login || "").trim().toLowerCase();
  return [...CONTAS_DEMO, ...contasCadastradas()].some((c) => String(c.login).toLowerCase() === alvo);
}

function cadastrarConta(dados) {
  if (loginEmUso(dados.login)) throw new Error("Este usuário já está em uso. Escolha outro.");
  const lista = contasCadastradas();
  lista.push({ ...dados, instituicao: "Instituição de Ensino", campus: "Campus Lapa" });
  localStorage.setItem(CONTAS_KEY, JSON.stringify(lista));
}

async function autenticar(login, senha) {
  if (AUTH_MODE === "api") {
    const base = String(window.ELO_API_BASE_URL || "").replace(/\/+$/, "");
    let resposta;
    try {
      resposta = await fetch(`${base}/auth/login`, {
        method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(login).trim().toLowerCase(), senha })
      });
    } catch { throw new Error("Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente."); }
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) throw new Error(resposta.status === 500 ? "Ocorreu um erro interno. Tente novamente." : (corpo.erro || corpo.mensagem || "Não foi possível entrar."));
    const u = corpo.usuario || {};
    const perfil = ({ admin: "administrador", operador: "operador" })[String(u.papel || "").toLowerCase()] || String(u.papel || "").toLowerCase();
    return { ...u, perfil, login: u.email, token: corpo.token, nome: u.nome, solicitante_id: u.solicitante_id };
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  const conta = [...CONTAS_DEMO, ...contasCadastradas()].find((item) => item.login === login && item.senha === senha);
  if (!conta) throw new Error("Usuário ou senha incorretos. Confira os dados e tente novamente.");
  const { senha: _senhaDaConta, ...dadosDaConta } = conta;
  return { ...dadosDaConta, token: "demo" };
}

function salvarSessao(sessao, lembrar = false) {
  const alvo = lembrar ? localStorage : sessionStorage;
  alvo.setItem(SESSION_KEY, JSON.stringify(sessao));
  if (lembrar) sessionStorage.removeItem(SESSION_KEY);
  else localStorage.removeItem(SESSION_KEY);
}

function obterSessao() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const valor = store.getItem(SESSION_KEY);
      if (valor) return JSON.parse(valor);
    } catch { /* armazenamento indisponível ou conteúdo inválido */ }
  }
  return null;
}

function limparSessao() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function sair() {
  limparSessao();
  localStorage.removeItem("elo.login.salvo");
  window.location.href = "../index.html";
}

(function inicializarLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const erro = document.getElementById("login-erro");
  const botao = document.getElementById("login-btn");
  const login = document.getElementById("login");
  const senha = document.getElementById("senha");
  const toggle = document.getElementById("senha-toggle");
  const lembrar = document.getElementById("lembrar");
  const recuperar = document.getElementById("esqueci-senha");
  const tiposAcesso = [...form.querySelectorAll('input[name="tipo-acesso"]')];
  if (AUTH_MODE === "api") {
    login.type = "email";
    login.autocomplete = "username";
    login.placeholder = "voce@instituicao.edu.br";
    const label = form.querySelector('label[for="login"]');
    if (label) label.textContent = "E-mail institucional";
    const ajuda = form.querySelector(".field small, .hint");
    if (ajuda) ajuda.textContent = "Use o e-mail cadastrado pela instituição.";
    const cartaoLogin = typeof form.closest === "function" ? form.closest(".card") : null;
    const cabecalho = cartaoLogin?.querySelector(".card-head p");
    if (cabecalho) cabecalho.textContent = "Entre com seu e-mail institucional e sua senha.";
    const notaLogin = typeof document.querySelector === "function" ? document.querySelector(".login-note") : null;
    if (notaLogin) notaLogin.textContent = "No primeiro acesso, você precisará criar sua senha pessoal.";
    const seletor = form.querySelector(".access-picker");
    if (seletor) seletor.hidden = true;
  }

  const mostrarMensagem = (texto, tipo = "error") => {
    erro.textContent = texto;
    erro.className = `alert ${tipo === "info" ? "alert-info" : tipo === "ok" ? "alert-ok" : "alert-error"}`;
    erro.hidden = false;
  };
  const tipoSelecionado = () => form.querySelector('input[name="tipo-acesso"]:checked')?.value || "usuario";
  const acessoCombina = (perfil, tipo) => tipo === "administracao"
    ? PERFIS_EQUIPE.has(String(perfil || "").toLowerCase())
    : PERFIS_USUARIO.has(String(perfil || "").toLowerCase());

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("cadastro") === "ok") {
      mostrarMensagem("Conta criada com sucesso! Entre com seu usuário e senha.", "ok");
      const novo = sessionStorage.getItem("elo.cadastro.login");
      if (novo) { login.value = novo; sessionStorage.removeItem("elo.cadastro.login"); }
      window.history.replaceState(null, "", window.location.pathname);
    }
  } catch { /* a mensagem de boas-vindas é opcional */ }

  const sessaoAtual = obterSessao();
  if (sessaoAtual && PERFIS_VALIDOS.has(String(sessaoAtual.perfil || "").toLowerCase())) {
    window.location.replace(sessaoAtual.deve_trocar_senha ? "pages/trocar-senha.html" : DASHBOARD_URL);
    return;
  }
  if (sessaoAtual) limparSessao();

  try {
    const salvo = localStorage.getItem("elo.login.salvo");
    if (salvo) {
      login.value = salvo;
      lembrar.checked = true;
    }
  } catch { /* a tela continua disponível mesmo sem persistência local */ }

  toggle.addEventListener("click", () => {
    const mostrar = senha.type === "password";
    senha.type = mostrar ? "text" : "password";
    toggle.textContent = mostrar ? "Ocultar" : "Mostrar";
    toggle.setAttribute("aria-pressed", String(mostrar));
    toggle.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
    senha.focus({ preventScroll: true });
  });

  tiposAcesso.forEach((radio) => radio.addEventListener("change", () => {
    erro.hidden = true;
  }));

  recuperar.addEventListener("click", () => {
    mostrarMensagem("A recuperação de senha ainda não está conectada ao servidor. Procure a administração para recuperar o acesso.", "info");
  });

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    erro.hidden = true;

    if (!login.value.trim()) {
      mostrarMensagem(AUTH_MODE === "api" ? "Informe seu e-mail." : "Informe seu usuário ou matrícula.");
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
      const sessao = await autenticar(login.value.trim(), senha.value);
      const perfil = String(sessao.perfil || "").toLowerCase();
      if (!PERFIS_VALIDOS.has(perfil)) {
        throw new Error("O perfil vinculado à conta não é reconhecido. Procure a administração.");
      }
      if (AUTH_MODE !== "api" && !acessoCombina(perfil, tipoSelecionado())) {
        throw new Error(tipoSelecionado() === "administracao"
          ? "Esta conta não possui perfil administrativo. Selecione “Discente, docente ou servidor” ou procure a administração."
          : "Esta conta pertence à equipe administrativa. Selecione “Administrador / TI” para continuar.");
      }

      salvarSessao(sessao, lembrar.checked);
      if (lembrar.checked) localStorage.setItem("elo.login.salvo", login.value.trim());
      else localStorage.removeItem("elo.login.salvo");
      window.location.replace(sessao.deve_trocar_senha ? "pages/trocar-senha.html" : DASHBOARD_URL);
    } catch (falha) {
      mostrarMensagem(falha.message || "Não foi possível entrar. Tente novamente.");
      botao.disabled = false;
      botao.textContent = "Entrar";
      senha.select();
    }
  });
})();
