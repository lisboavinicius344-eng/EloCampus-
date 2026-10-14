/* ELO Campus — camada de acesso aos dados
 *
 * As telas só chamam o objeto ELO. Para integrar com o back-end, basta
 * trocar MODO_DADOS para "api" e ajustar API_BASE_URL e os caminhos.
 * Os caminhos abaixo são sugestões a combinar com a equipe do back-end.
 *
 * Contrato de erros sugerido para gravações: 409 (conflito, ex.: patrimônio
 * duplicado) e 422 (dado inválido) com corpo { "mensagem": "...", "campo": "patrimonio" }.
 */

const API_BASE_URL = "http://localhost:3000/api";
const MODO_DADOS = "demo"; // "demo" | "api"

// Endereço público da pasta pages/ usado dentro dos QR Codes das etiquetas.
// Deixe vazio para usar o endereço atual (ok para testes). Em produção, informe
// o endereço definitivo, ex.: "https://elo.exemplo.edu.br/pages". Etiquetas
// impressas com o endereço errado precisam ser refeitas.
const URL_CONSULTA_BASE = "";

async function requisitar(caminho, opcoes = {}) {
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const headers = { Accept: "application/json" };
  if (opcoes.corpo) headers["Content-Type"] = "application/json";
  if (sessao && sessao.token) headers.Authorization = `Bearer ${sessao.token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      method: opcoes.metodo || "GET",
      headers,
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
  if (resposta.status === 404) {
    const erro = new Error("Não encontrado.");
    erro.naoEncontrado = true;
    throw erro;
  }
  if (!resposta.ok) throw new Error("O servidor não conseguiu atender a solicitação. Tente novamente em instantes.");
  return resposta.json();
}

async function origem(demo, caminho, opcoes) {
  if (MODO_DADOS === "demo") {
    await new Promise((r) => setTimeout(r, 250)); // simula a rede
    return demo();
  }
  return requisitar(caminho, opcoes);
}

const ELO = {
  resumoDashboard: () => origem(demoResumo, "/dashboard/resumo"),
  equipamentos:    () => origem(demoEquipamentos, "/equipamentos"),
  equipamento:     (id) => origem(() => demoEquipamento(id), `/equipamentos/${encodeURIComponent(id)}`),
  movimentacoesEquipamento: (id) => origem(() => demoMovimentacoesEquipamento(id), `/equipamentos/${encodeURIComponent(id)}/movimentacoes`),
  // Consulta pública (sem login): o back-end deve devolver só os campos públicos.
  consultarPublico: (patrimonio) => origem(() => demoConsultaPublica(patrimonio), `/publico/equipamentos/${encodeURIComponent(patrimonio)}`),
  emprestimos:     () => origem(demoEmprestimos, "/emprestimos"),
  movimentacoes:   () => origem(demoMovimentacoes, "/movimentacoes?limite=8"),

  // Só confirma sucesso depois que o servidor (ou o demo) aceitou o registro.
  salvarEquipamento: (dados, id) => origem(
    () => demoSalvarEquipamento(dados, id),
    id ? `/equipamentos/${encodeURIComponent(id)}` : "/equipamentos",
    { metodo: id ? "PUT" : "POST", corpo: dados }
  ),
};