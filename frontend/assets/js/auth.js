/* ELO Campus — autenticação de demonstração e gestão da sessão local.
 * A validação real deve ser fornecida pelo backend/API. Os perfis abaixo são
 * apenas contas locais para demonstrar a navegação enquanto essa integração não existe.
 */
"use strict";

const AUTH_MODE = "demo";
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

async function autenticar(login, senha) {
  // Simula apenas latência visual; não representa autenticação institucional.
  await new Promise((resolve) => setTimeout(resolve, 250));
  const conta = CONTAS_DEMO.find((item) => item.login === login && item.senha === senha);
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

  const mostrarMensagem = (texto, tipo = "error") => {
    erro.textContent = texto;
    erro.className = `alert ${tipo === "info" ? "alert-info" : "alert-error"}`;
    erro.hidden = false;
  };
  const tipoSelecionado = () => form.querySelector('input[name="tipo-acesso"]:checked')?.value || "usuario";
  const acessoCombina = (perfil, tipo) => tipo === "administracao"
    ? PERFIS_EQUIPE.has(String(perfil || "").toLowerCase())
    : PERFIS_USUARIO.has(String(perfil || "").toLowerCase());

  const sessaoAtual = obterSessao();
  if (sessaoAtual && PERFIS_VALIDOS.has(String(sessaoAtual.perfil || "").toLowerCase())) {
    window.location.replace(DASHBOARD_URL);
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
      mostrarMensagem("Informe seu usuário ou matrícula.");
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
      if (!acessoCombina(perfil, tipoSelecionado())) {
        throw new Error(tipoSelecionado() === "administracao"
          ? "Esta conta não possui perfil administrativo. Selecione “Discente, docente ou servidor” ou procure a administração."
          : "Esta conta pertence à equipe administrativa. Selecione “Administrador / TI” para continuar.");
      }

      salvarSessao(sessao, lembrar.checked);
      if (lembrar.checked) localStorage.setItem("elo.login.salvo", login.value.trim());
      else localStorage.removeItem("elo.login.salvo");
      window.location.replace(DASHBOARD_URL);
    } catch (falha) {
      mostrarMensagem(falha.message || "Não foi possível entrar. Tente novamente.");
      botao.disabled = false;
      botao.textContent = "Entrar";
      senha.select();
    }
  });
})();
