/* ELO Campus — integração exclusiva com a API oficial. Sem dados de demonstração no navegador. */
"use strict";

const API_BASE_URL = String(window.ELO_API_BASE_URL || "").replace(/\/+$/, "");
const MODO_DADOS = "api";

const estadoFrontend = (valor) => ({ novo: "Novo", bom: "Bom", regular: "Regular", danificado: "Danificado" }[String(valor || "").toLowerCase()] || valor || "");
const estadoApi = (valor) => String(valor || "bom").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizarEquipamento = (equipamento = {}) => ({
  ...equipamento,
  patrimonio: equipamento.numero_patrimonio ?? equipamento.patrimonio ?? "",
  categoria: equipamento.categoria ?? "",
  condicao: estadoFrontend(equipamento.estado_conservacao ?? equipamento.condicao),
  situacao: equipamento.situacao || ({ disponivel: "disponivel", emprestado: "emprestado", manutencao: "manutencao", baixado: "inativo" }[equipamento.status] || "disponivel"),
  base: equipamento.status === "baixado" ? "inativo" : equipamento.status,
  localizacao: equipamento.localizacao || "",
  imagem: equipamento.imagem_url
    ? (/^https?:\/\//i.test(equipamento.imagem_url) ? equipamento.imagem_url : `${API_BASE_URL}${equipamento.imagem_url}`)
    : (equipamento.imagem || ""),
});

const normalizarEmprestimo = (emprestimo = {}) => {
  const item = (emprestimo.itens || [])[0] || {};
  const previsto = emprestimo.data_prevista_devolucao ? new Date(emprestimo.data_prevista_devolucao) : null;
  const atrasado = emprestimo.status === "em_andamento" && previsto instanceof Date && !Number.isNaN(previsto.valueOf()) && previsto.valueOf() < Date.now();
  return {
    ...emprestimo,
    emprestimoId: emprestimo.id,
    equipamento: {
      id: item.equipamento_id ?? emprestimo.equipamento_id,
      nome: item.equipamento || emprestimo.equipamento || "Equipamento",
      patrimonio: item.numero_patrimonio || emprestimo.numero_patrimonio || "",
      categoria: item.categoria || "",
      setor: item.setor || "",
      condicao: estadoFrontend(item.estado_na_retirada),
    },
    solicitante: { id: emprestimo.solicitante_id, nome: emprestimo.solicitante || "—", vinculo: "", matricula: "" },
    retirada: emprestimo.data_emprestimo,
    prevista: emprestimo.data_prevista_devolucao,
    devolvida: item.data_devolucao || (emprestimo.status === "concluido" ? emprestimo.data_devolucao : null),
    registradoPor: emprestimo.usuario_responsavel || "—",
    observacoes: emprestimo.observacoes || "",
    situacao: emprestimo.status === "concluido" || item.data_devolucao ? "devolvido" : emprestimo.status === "cancelado" ? "cancelado" : atrasado ? "atrasado" : "emprestado",
    itens: emprestimo.itens || [],
  };
};

// Remove secrets from parsed API responses before exposing objects to page code.
// The backend must also avoid returning secrets at all; DevTools can still show raw HTTP responses.
function sanitizarResposta(valor) {
  if (Array.isArray(valor)) return valor.map(sanitizarResposta);
  if (!valor || typeof valor !== "object") return valor;
  const sensiveis = new Set([
    "senha", "senhaprovisoria", "senhaatual", "novasenha", "password", "temporarypassword",
    "passwordhash", "senhahash", "token", "accesstoken", "refreshtoken", "resettoken", "tokenrecuperacao",
  ]);
  return Object.fromEntries(Object.entries(valor)
    .filter(([chave]) => !sensiveisTem(chave, sensiveis))
    .map(([chave, conteudo]) => [chave, sanitizarResposta(conteudo)]));
}
function sensiveisTem(chave, sensiveis) {
  const normalizada = String(chave).toLowerCase().replace(/[_\s-]/g, "");
  return sensiveis.has(normalizada);
}

async function requisitar(caminho, opcoes = {}) {
  if (!API_BASE_URL) throw new Error("A API do ELO Campus não está configurada. Defina ELO_API_BASE_URL.");
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const headers = { Accept: "application/json" };
  if (opcoes.corpo !== undefined && opcoes.corpo !== null) headers["Content-Type"] = "application/json";
  if (!opcoes.semAutenticacao && sessao?.token) headers.Authorization = `Bearer ${sessao.token}`;

  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      method: opcoes.metodo || "GET",
      headers,
      body: opcoes.corpo == null ? undefined : JSON.stringify(opcoes.corpo),
      cache: "no-store",
      credentials: "omit",
    });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.");
  }

  const corpoBruto = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    if (resposta.status === 403 && corpoBruto?.codigo === "TROCA_DE_SENHA_OBRIGATORIA" && !location.pathname.endsWith("trocar-senha.html")) {
      location.href = location.pathname.includes("/pages/") ? "trocar-senha.html" : "pages/trocar-senha.html";
    }
    let mensagem = corpoBruto?.erro || corpoBruto?.mensagem || "Não foi possível concluir a solicitação.";
    if (resposta.status === 500) mensagem = "Ocorreu um erro interno. Tente novamente em instantes.";
    if (resposta.status === 401 && !opcoes.naoRedirecionar401) {
      try {
        sessionStorage.removeItem("elo.sessao");
        localStorage.removeItem("elo.sessao");
      } catch { /* o navegador pode bloquear o armazenamento */ }
      if (!/\/(index\.html)?$/.test(location.pathname)) location.href = "../index.html?sessao=expirada";
    }
    const erro = new Error(mensagem);
    erro.status = resposta.status;
    erro.codigo = corpoBruto?.codigo;
    erro.campo = corpoBruto?.campo;
    throw erro;
  }
  return sanitizarResposta(corpoBruto);
}

const ELO = {
  modo: () => MODO_DADOS,
  verificarSaude: () => requisitar("/health", { semAutenticacao: true, naoRedirecionar401: true }),
  resumoDashboard: () => requisitar("/dashboard/resumo"),
  equipamentos: async () => (await requisitar("/equipamentos")).equipamentos.map(normalizarEquipamento),
  equipamento: async (id) => normalizarEquipamento((await requisitar(`/equipamentos/${encodeURIComponent(id)}`)).equipamento),
  consultaQr: async (codigo) => {
    const caminho = `/consulta-qr/${encodeURIComponent(String(codigo || "").trim())}`;
    const sessao = typeof obterSessao === "function" ? obterSessao() : null;
    // A consulta é pública, mas uma sessão válida de equipe recebe os detalhes do empréstimo atual.
    if (!sessao?.token) return requisitar(caminho, { semAutenticacao: true, naoRedirecionar401: true });
    try {
      return await requisitar(caminho, { naoRedirecionar401: true });
    } catch (erro) {
      // Consulta pública continua disponível quando o token expirou; descarte a sessão antiga.
      if (erro.status === 401) {
        if (typeof limparSessao === "function") limparSessao();
        return requisitar(caminho, { semAutenticacao: true, naoRedirecionar401: true });
      }
      throw erro;
    }
  },
  perfil: async () => obterSessao()?.usuario || obterSessao() || {},
  salvarPerfil: async () => { throw new Error("A API ainda não disponibiliza edição de perfil. Nenhuma alteração foi salva."); },
  emprestimos: async () => (await requisitar("/emprestimos")).emprestimos.map(normalizarEmprestimo),
  movimentacoes: async () => (await requisitar("/historico")).map((movimento) => ({
    id: movimento.id, quando: movimento.data_movimentacao, tipo: movimento.tipo_movimentacao,
    classe: movimento.tipo_movimentacao,
    equipamento: { id: movimento.equipamento_id, nome: movimento.equipamento_nome, patrimonio: "", categoria: "" },
    detalhe: movimento.descricao, por: movimento.usuario_nome, emprestimoId: movimento.emprestimo_id,
  })),
  registrarEmprestimo: async (dados) => {
    const sessao = obterSessao() || {};
    let solicitanteId = dados.solicitante_id ?? sessao.solicitante_id;
    if (!solicitanteId && dados.solicitante) {
      const solicitantes = (await requisitar("/solicitantes")).solicitantes || [];
      solicitanteId = solicitantes.find((pessoa) => String(pessoa.nome || "").trim().toLocaleLowerCase("pt-BR") === String(dados.solicitante).trim().toLocaleLowerCase("pt-BR"))?.id;
    }
    if (!solicitanteId) throw new Error("Não foi possível identificar o cadastro do solicitante. Confira se ele está cadastrado e ativo.");
    return requisitar("/emprestimos", { metodo: "POST", corpo: {
      solicitante_id: Number(solicitanteId),
      equipamentos: (dados.equipamentos || []).map(Number),
      data_prevista_devolucao: new Date(dados.prevista).toISOString(),
      observacoes: [dados.finalidade, dados.observacoes].filter(Boolean).join(" — ") || null,
    } });
  },
  registrarDevolucao: async (dados) => {
    const lista = (await requisitar("/emprestimos")).emprestimos || [];
    const ids = new Set((dados.itens || []).map(String));
    const alvos = lista.filter((emprestimo) => ids.has(String(emprestimo.id)) || ids.has(String(emprestimo.equipamento_id)));
    if (!alvos.length) throw new Error("Não foi possível relacionar os itens selecionados aos empréstimos. Atualize a página.");
    let feitos = 0;
    for (const emprestimo of alvos) {
      const detalhe = (await requisitar(`/emprestimos/${encodeURIComponent(emprestimo.id)}`)).emprestimo;
      for (const item of detalhe.itens || []) {
        if ((ids.has(String(item.equipamento_id)) || ids.has(String(emprestimo.id))) && !item.data_devolucao) {
          await requisitar(`/emprestimos/${encodeURIComponent(emprestimo.id)}/itens/${encodeURIComponent(item.equipamento_id)}/devolver`, {
            metodo: "PATCH",
            corpo: {
              estado_na_devolucao: estadoApi(dados.condicao || "bom"),
              observacoes: [dados.observacoes, dados.acessoriosConferidos ? "Acessórios conferidos" : "", dados.equipamentoConferido ? "Equipamento conferido" : "", dados.assinaturaRecebida ? "Assinatura recebida" : ""].filter(Boolean).join("; ") || null,
            },
          });
          feitos += 1;
        }
      }
    }
    if (!feitos) throw new Error("Nenhum item pendente de devolução foi encontrado.");
    return { itens: feitos };
  },
  removerEquipamento: (id) => requisitar(`/equipamentos/${encodeURIComponent(id)}/inativar`, { metodo: "PATCH" }),
  salvarEquipamento: async (d, id) => {
    const corpo = {
      nome: d.nome,
      numero_patrimonio: d.patrimonio || d.numero_patrimonio,
      setor: d.setor,
      localizacao: d.localizacao || "",
      estado_conservacao: estadoApi(d.condicao || d.estado_conservacao),
      qr_code: d.qr_code || d.patrimonio || d.numero_patrimonio,
      observacoes: d.observacoes || null,
      elegibilidade: d.elegibilidade || "todos",
    };
    if (d.categoria_id) corpo.categoria_id = Number(d.categoria_id);
    else corpo.categoria = String(d.categoria || "").trim();
    if (d.imagemAlterada) corpo.imagem = d.imagem || null; // null remove a foto existente
    return (await requisitar(id ? `/equipamentos/${encodeURIComponent(id)}` : "/equipamentos", {
      metodo: id ? "PUT" : "POST",
      corpo,
    })).equipamento;
  },
  categorias: async () => (await requisitar("/categorias")).categorias,
  categoria: async (id) => (await requisitar(`/categorias/${encodeURIComponent(id)}`)).categoria,
  criarCategoria: (dados) => requisitar("/categorias", { metodo: "POST", corpo: { nome: String(dados.nome || "").trim(), descricao: String(dados.descricao || "").trim() || null } }),
  editarCategoria: (id, dados) => requisitar(`/categorias/${encodeURIComponent(id)}`, { metodo: "PUT", corpo: { nome: String(dados.nome || "").trim(), descricao: String(dados.descricao || "").trim() || null } }),
  desativarCategoria: (id) => requisitar(`/categorias/${encodeURIComponent(id)}/desativar`, { metodo: "PATCH" }),
  solicitantes: async () => {
    const resposta = await requisitar("/solicitantes");
    if (!Array.isArray(resposta?.solicitantes)) {
      throw new Error("A resposta da API de solicitantes está fora do contrato esperado. Confirme se GET /solicitantes retorna { solicitantes: [...] }.");
    }
    return resposta.solicitantes;
  },
  solicitante: async (id) => (await requisitar(`/solicitantes/${encodeURIComponent(id)}`)).solicitante,
  criarSolicitante: (dados) => requisitar("/solicitantes", {
    metodo: "POST",
    corpo: {
      nome: String(dados.nome || "").trim(),
      tipo: String(dados.tipo || "").trim().toLowerCase(),
      setor: String(dados.setor || "").trim() || null,
      email: String(dados.email || "").trim().toLowerCase() || null,
      telefone: String(dados.telefone || "").trim() || null,
    },
  }),
  editarSolicitante: (id, dados) => requisitar(`/solicitantes/${encodeURIComponent(id)}`, {
    metodo: "PUT",
    corpo: {
      nome: String(dados.nome || "").trim(),
      tipo: String(dados.tipo || "").trim().toLowerCase(),
      setor: String(dados.setor || "").trim() || null,
      email: String(dados.email || "").trim().toLowerCase() || null,
      telefone: String(dados.telefone || "").trim() || null,
    },
  }),
  desativarSolicitante: (id) => requisitar(`/solicitantes/${encodeURIComponent(id)}/desativar`, { metodo: "PATCH" }),
  salvarSolicitante: (id, dados) => ELO.editarSolicitante(id, dados),
  reservas: async () => (await requisitar("/reservas")).reservas,
  criarReserva: (dados) => requisitar("/reservas", { metodo: "POST", corpo: dados }),
  aprovarReserva: (id) => requisitar(`/reservas/${encodeURIComponent(id)}/aprovar`, { metodo: "PATCH" }),
  rejeitarReserva: (id) => requisitar(`/reservas/${encodeURIComponent(id)}/rejeitar`, { metodo: "PATCH" }),
  cancelarReserva: (id) => requisitar(`/reservas/${encodeURIComponent(id)}/cancelar`, { metodo: "PATCH" }),
  retirarReserva: (id, dados = {}) => requisitar(`/reservas/${encodeURIComponent(id)}/retirar`, { metodo: "POST", corpo: dados }),
  manutencoes: async () => (await requisitar("/manutencoes")).manutencoes,
  abrirManutencao: (dados) => requisitar("/manutencoes", { metodo: "POST", corpo: dados }),
  finalizarManutencao: (id, dados) => requisitar(`/manutencoes/${encodeURIComponent(id)}/finalizar`, { metodo: "PATCH", corpo: dados }),
  cadastroAluno: (dados) => requisitar("/auth/cadastro-aluno", { metodo: "POST", semAutenticacao: true, naoRedirecionar401: true, corpo: {
    nome: String(dados.nome || "").trim(), email: String(dados.email || "").trim().toLowerCase(), solicitante_id: Number(dados.solicitante_id),
  } }),
  solicitarRecuperacaoSenha: async (email) => {
    try {
      return await requisitar("/auth/esqueci-senha", { metodo: "POST", semAutenticacao: true, naoRedirecionar401: true, corpo: { email: String(email || "").trim().toLowerCase() } });
    } catch (erro) {
      if (erro.status === 404 || erro.status === 405) {
        const indisponivel = new Error("A recuperação automática ainda não está habilitada no servidor. Entre em contato com a administração para solicitar o reenvio da senha provisória.");
        indisponivel.status = erro.status;
        throw indisponivel;
      }
      throw erro;
    }
  },
  trocarSenha: (dados) => requisitar("/auth/trocar-senha", { metodo: "POST", corpo: { senha_atual: dados.senha_atual, nova_senha: dados.nova_senha } }),
  usuarios: async () => (await requisitar("/usuarios")).usuarios,
  criarUsuario: (dados) => requisitar("/usuarios", { metodo: "POST", corpo: { nome: String(dados.nome || "").trim(), email: String(dados.email || "").trim().toLowerCase(), papel: dados.papel } }),
  reenviarSenha: (id) => requisitar(`/usuarios/${encodeURIComponent(id)}/reenviar-senha`, { metodo: "PATCH" }),
  desativarUsuario: (id) => requisitar(`/usuarios/${encodeURIComponent(id)}/desativar`, { metodo: "PATCH" }),
};
