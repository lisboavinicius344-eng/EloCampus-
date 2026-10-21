/* Autenticação demo preparada para futura API. */
const AUTH_MODE = "demo";
const SESSION_KEY = "elo.sessao";
const REMEMBER_KEY = "elo.sessao.lembrar";
const DASHBOARD_URL = "pages/dashboard.html";
const CONTAS_DEMO = [
  { login: "admin", senha: "admin123", nome: "Administrador", perfil: "administrador", email: "admin@instituicao.edu.br", telefone: "(77) 99999-0000", matricula: "ADM-0001", setor: "Direção", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "operador", senha: "operador123", nome: "Operador", perfil: "operador", email: "operador@instituicao.edu.br", telefone: "(77) 98888-1111", matricula: "SRV-0024", setor: "Coordenação de TI", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "aluno", senha: "aluno123", nome: "Mariana Costa", perfil: "aluno", email: "mariana@lapa.edu.br", matricula: "2024118", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
  { login: "professor", senha: "professor123", nome: "Prof. Ricardo Alves", perfil: "professor", email: "ricardo.alves@lapa.edu.br", matricula: "SIAPE 1048873", instituicao: "Instituição de Ensino", campus: "Campus Lapa" },
];
async function autenticar(login, senha) { await new Promise(r => setTimeout(r, 350)); const conta=CONTAS_DEMO.find(c=>c.login===login&&c.senha===senha); if(!conta) throw new Error("Usuário ou senha incorretos. Confira os dados e tente de novo."); return {...conta, token:"demo"}; }
function salvarSessao(sessao, lembrar=false) { const alvo=lembrar?localStorage:sessionStorage; alvo.setItem(SESSION_KEY, JSON.stringify(sessao)); if(lembrar) sessionStorage.removeItem(SESSION_KEY); else localStorage.removeItem(SESSION_KEY); }
function obterSessao() { for (const store of [sessionStorage, localStorage]) { try { const value=store.getItem(SESSION_KEY); if(value) return JSON.parse(value); } catch {} } return null; }
function sair() { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); window.location.href="../index.html"; }
const form=document.getElementById("login-form");
if(form){ const erro=document.getElementById("login-erro"), botao=document.getElementById("login-btn"), login=document.getElementById("login"), senha=document.getElementById("senha"), toggle=document.getElementById("senha-toggle"), lembrar=document.getElementById("lembrar"), recuperar=document.getElementById("esqueci-senha");
  if(obterSessao()) window.location.replace(DASHBOARD_URL);
  try { const salvo=JSON.parse(localStorage.getItem("elo.login.salvo")); if(salvo){login.value=salvo;lembrar.checked=true;} } catch {}
  toggle.addEventListener("click",()=>{const v=senha.type==="text";senha.type=v?"password":"text";toggle.textContent=v?"Mostrar":"Ocultar";toggle.setAttribute("aria-pressed",String(!v));});
  recuperar.addEventListener("click",()=>{erro.textContent="Para recuperar o acesso, informe seu e-mail institucional à administração. Em produção, este fluxo enviará um link seguro de redefinição.";erro.className="alert alert-info";erro.hidden=false;});
  form.addEventListener("submit",async e=>{e.preventDefault();erro.hidden=true;erro.className="alert alert-error";if(!login.value.trim())return erro.textContent="Informe o usuário.",erro.hidden=false,login.focus();if(!senha.value)return erro.textContent="Informe a senha.",erro.hidden=false,senha.focus();botao.disabled=true;botao.textContent="Entrando…";try{const sessao=await autenticar(login.value.trim(),senha.value);salvarSessao(sessao,lembrar.checked);if(lembrar.checked)localStorage.setItem("elo.login.salvo",login.value.trim());else localStorage.removeItem("elo.login.salvo");window.location.href=DASHBOARD_URL;}catch(err){erro.textContent=err.message;erro.hidden=false;botao.disabled=false;botao.textContent="Entrar";senha.select();}});
}
