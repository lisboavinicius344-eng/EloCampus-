/* ELO Campus — autenticação
 *
 * AUTH_MODE = "demo": valida contra contas fictícias (apenas protótipo).
 * AUTH_MODE = "api" : envia as credenciais ao back-end (POST /api/auth/login).
 *
 * Atenção: a validação real de acesso e permissões é do back-end.
 * Esconder botões no front-end não protege nenhuma operação.
 */

const AUTH_MODE = "demo";
// API_BASE_URL vem do api.js (carregue o api.js antes deste arquivo no index.html)
const SESSION_KEY = "elo.sessao";
const DASHBOARD_URL = "pages/dashboard.html";

// Dados de demonstração — remover na integração com a API.
const CONTAS_DEMO = [
  { login: "admin",    senha: "admin123",    nome: "Administrador", perfil: "administrador" },
  { login: "operador", senha: "operador123", nome: "Operador",      perfil: "operador" },
];

async function autenticar(login, senha) {
  if (AUTH_MODE === "demo") {
    await new Promise((r) => setTimeout(r, 400)); // simula a rede
    const conta = CONTAS_DEMO.find((c) => c.login === login && c.senha === senha);
    if (!conta) throw new Error("Usuário ou senha incorretos. Confira os dados e tente de novo.");
    return { nome: conta.nome, perfil: conta.perfil, token: "demo" };
  }

  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, senha }),
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique a rede e tente novamente.");
  }

  if (resposta.status === 401) throw new Error("Usuário ou senha incorretos. Confira os dados e tente de novo.");
  if (!resposta.ok) throw new Error("O servidor não confirmou o acesso. Tente novamente em instantes.");
  return resposta.json();
}

function salvarSessao(sessao) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessao));
}

function obterSessao() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function sair() {
  sessionStorage.removeItem(SESSION_KEY);
  window.location.href = "../index.html";
}

/* ---------- Página de login ---------- */
const form = document.getElementById("login-form");

if (form) {
  const erro = document.getElementById("login-erro");
  const botao = document.getElementById("login-btn");
  const campoLogin = document.getElementById("login");
  const campoSenha = document.getElementById("senha");
  const toggle = document.getElementById("senha-toggle");

  if (obterSessao()) window.location.replace(DASHBOARD_URL);
  if (AUTH_MODE === "demo") document.getElementById("demo-aviso").hidden = false;

  const mostrarErro = (msg) => { erro.textContent = msg; erro.hidden = false; };

  toggle.addEventListener("click", () => {
    const visivel = campoSenha.type === "text";
    campoSenha.type = visivel ? "password" : "text";
    toggle.textContent = visivel ? "Mostrar" : "Ocultar";
    toggle.setAttribute("aria-pressed", String(!visivel));
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;

    const login = campoLogin.value.trim();
    const senha = campoSenha.value;

    if (!login) { mostrarErro("Informe o usuário."); campoLogin.focus(); return; }
    if (!senha) { mostrarErro("Informe a senha."); campoSenha.focus(); return; }

    botao.disabled = true;
    botao.textContent = "Entrando…";

    try {
      salvarSessao(await autenticar(login, senha));
      window.location.href = DASHBOARD_URL;
    } catch (err) {
      mostrarErro(err.message);
      botao.disabled = false;
      botao.textContent = "Entrar";
      campoSenha.select();
    }
  });
}