/* ELO Campus — camada de acesso aos dados
 * As telas dependem deste contrato, não da origem dos registros.
 * No modo demo as operações são salvas localmente e não representam registros oficiais.
 */
const API_BASE_URL = String(window.ELO_API_BASE_URL || "").replace(/\/+$/, "");
const MODO_DADOS = String(window.ELO_DATA_MODE || "demo").toLowerCase() === "api" ? "api" : "demo"; // "demo" | "api"

async function requisitar(caminho, opcoes = {}) {
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const headers = { Accept: "application/json" };
  if (opcoes.corpo) headers["Content-Type"] = "application/json";
  if (sessao && sessao.token) headers.Authorization = `Bearer ${sessao.token}`;
  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      method: opcoes.metodo || "GET", headers,
      body: opcoes.corpo ? JSON.stringify(opcoes.corpo) : undefined,
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique a rede e tente novamente.");
  }
  if (resposta.status === 401) {
    sessionStorage.removeItem("elo.sessao");
    window.location.href = "../index.html";
    throw new Error("Sua sessão expirou. Entre novamente.");
  }
  if (resposta.status === 409 || resposta.status === 422) {
    const corpo = await resposta.json().catch(() => ({}));
    const erro = new Error(corpo.mensagem || "Os dados enviados não foram aceitos. Revise os campos.");
    erro.campo = corpo.campo;
    throw erro;
  }
  if (!resposta.ok) throw new Error("O servidor não conseguiu atender à solicitação. Tente novamente em instantes.");
  return resposta.status === 204 ? null : resposta.json();
}

async function origem(demo, caminho, opcoes) {
  if (MODO_DADOS === "demo") {
    await new Promise((resolve) => setTimeout(resolve, 30));
    return demo();
  }
  return requisitar(caminho, opcoes);
}

const ELO = {
  resumoDashboard: () => origem(demoResumo, "/dashboard/resumo"),
  equipamentos: () => origem(demoEquipamentos, "/equipamentos"),
  equipamento: (id) => origem(() => demoEquipamento(id), `/equipamentos/${encodeURIComponent(id)}`),
  consultaQr: (codigo) => MODO_DADOS === "demo"
    ? Promise.resolve(demoConsultaQr(codigo))
    : requisitar(`/consulta-qr/${encodeURIComponent(codigo)}`),
  perfil: () => MODO_DADOS === "demo" ? Promise.resolve(obterSessao() || {}) : requisitar("/perfil"),
  salvarPerfil: (dados) => MODO_DADOS === "demo" ? Promise.resolve(dados) : requisitar("/perfil", { metodo: "PUT", corpo: dados }),
  emprestimos: () => origem(demoEmprestimos, "/emprestimos"),
  movimentacoes: () => origem(demoMovimentacoes, "/movimentacoes"),
  registrarEmprestimo: (dados) => origem(() => demoRegistrarEmprestimo(dados), "/emprestimos", { metodo: "POST", corpo: dados }),
  registrarDevolucao: (dados) => origem(() => demoRegistrarDevolucao(dados), "/devolucoes", { metodo: "POST", corpo: dados }),
  removerEquipamento: (id) => MODO_DADOS === "demo" ? Promise.resolve(demoRemoverEquipamento(id)) : requisitar(`/equipamentos/${encodeURIComponent(id)}`, { metodo: "DELETE" }),
  salvarEquipamento: (dados, id) => origem(
    () => demoSalvarEquipamento(dados, id),
    id ? `/equipamentos/${encodeURIComponent(id)}` : "/equipamentos",
    { metodo: id ? "PUT" : "POST", corpo: dados }
  ),
};
