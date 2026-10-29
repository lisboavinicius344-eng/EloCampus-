/* ELO Campus — integração exclusiva com a API oficial. Sem dados de demonstração no navegador. */
"use strict";

const API_BASE_URL = String(window.ELO_API_BASE_URL || "").replace(/\/+$/, "");
const MODO_DADOS = "api";

const estadoFrontend = (valor) => ({ novo: "Novo", bom: "Bom", regular: "Regular", danificado: "Danificado" }[String(valor || "").toLowerCase()] || valor || "");
const estadoApi = (valor) => String(valor || "bom").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizarEquipamento = (equipamento = {}) => ({
  ...equipamento,
  patrimonio: equipamento.numero_patrimonio ?? equipamento.patrimonio ?? "",
  categoria: typeof equipamento.categoria === "string" ? equipamento.categoria : (equipamento.categoria?.nome ?? equipamento.categoria_nome ?? ""),
  condicao: estadoFrontend(equipamento.estado_conservacao ?? equipamento.condicao),
  situacao: equipamento.situacao || ({ disponivel: "disponivel", emprestado: "emprestado", manutencao: "manutencao", baixado: "inativo" }[equipamento.status] || "disponivel"),
  base: equipamento.status === "baixado" ? "inativo" : equipamento.status,
  localizacao: equipamento.localizacao || "",
  imagem: equipamento.imagem_url
    ? (/^https?:\/\//i.test(equipamento.imagem_url) ? equipamento.imagem_url : `${API_BASE_URL}${equipamento.imagem_url}`)
    : (equipamento.imagem || ""),
});

const normalizarEmprestimo = (emprestimo = {}) => {
  const itens = Array.isArray(emprestimo.itens) && emprestimo.itens.length
    ? emprestimo.itens
    : [{
        equipamento_id: emprestimo.equipamento_id,
        equipamento: emprestimo.equipamento,
        numero_patrimonio: emprestimo.numero_patrimonio,
        categoria: emprestimo.categoria,
        setor: emprestimo.setor,
        data_devolucao: emprestimo.data_devolucao,
        estado_na_devolucao: emprestimo.estado_na_devolucao,
      }];
  const solicitante = emprestimo.solicitante && typeof emprestimo.solicitante === "object"
    ? emprestimo.solicitante
    : {};
  return itens.map((item) => {
    const equipamentoId = item.equipamento_id ?? item.equipamento?.id ?? emprestimo.equipamento_id;
    const nomeEquipamento = typeof item.equipamento === "string"
      ? item.equipamento
      : item.equipamento?.nome ?? item.equipamento_nome ?? emprestimo.equipamento?.nome ?? emprestimo.equipamento ?? "Equipamento";
    const prevista = emprestimo.data_prevista_devolucao;
    const devolvida = item.data_devolucao || (emprestimo.status === "concluido" ? emprestimo.data_devolucao : null);
    const atrasado = !devolvida && emprestimo.status === "em_andamento" && prevista && new Date(prevista).valueOf() < Date.now();
    const condicaoDevolucaoApi = String(item.estado_na_devolucao ?? emprestimo.estado_na_devolucao ?? "").toLowerCase();
    const condicaoDevolucao = ({
      bom: "Bom", perfeito: "Bom", regular: "Regular", incompleto: "Regular",
      danificado: "Danificado", avaria: "Danificado", com_avaria: "Danificado",
    })[condicaoDevolucaoApi.replace(/[\s-]+/g, "_")] || (item.estado_na_devolucao ?? emprestimo.estado_na_devolucao ?? "");
    return {
      ...emprestimo,
      id: equipamentoId ?? emprestimo.id,
      emprestimoId: emprestimo.id,
      equipamento: {
        id: equipamentoId,
        nome: nomeEquipamento,
        patrimonio: item.numero_patrimonio ?? item.patrimonio ?? emprestimo.numero_patrimonio ?? "",
        categoria: item.categoria ?? item.categoria_nome ?? emprestimo.categoria ?? "",
        setor: item.setor ?? emprestimo.setor ?? "",
        condicao: estadoFrontend(item.estado_na_retirada ?? emprestimo.estado_na_retirada),
      },
      solicitante: {
        id: emprestimo.solicitante_id ?? solicitante.id,
        nome: typeof emprestimo.solicitante === "string" ? emprestimo.solicitante : solicitante.nome ?? emprestimo.solicitante_nome ?? "—",
        vinculo: emprestimo.vinculo ?? solicitante.tipo ?? solicitante.vinculo ?? "",
        matricula: emprestimo.matricula ?? solicitante.matricula ?? solicitante.numero_funcional ?? "",
      },
      retirada: emprestimo.data_emprestimo,
      prevista,
      devolvida,
      responsavelDevolucao: item.usuario_devolucao ?? item.usuario_recebeu ?? emprestimo.usuario_devolucao ?? emprestimo.usuario_recebeu ?? "—",
      condicaoDevolucao,
      registradoPor: emprestimo.usuario_responsavel || emprestimo.usuario_nome || "—",
      observacoes: emprestimo.observacoes || "",
      observacoesDevolucao: item.observacoes_devolucao ?? item.observacoes ?? "",
      situacao: devolvida ? "devolvido" : emprestimo.status === "cancelado" ? "cancelado" : atrasado ? "atrasado" : "emprestado",
      itens: emprestimo.itens || [],
    };
  });
};

// Remove secrets from parsed API responses before exposing objects to page code.
// The backend must also avoid returning secrets at all; DevTools can still show raw HTTP responses.
function sanitizarResposta(valor, opcoes = {}) {
  if (Array.isArray(valor)) return valor.map((item) => sanitizarResposta(item, opcoes));
  if (!valor || typeof valor !== "object") return valor;
  const sensiveis = new Set([
    "senha", "senhaprovisoria", "senhaatual", "novasenha", "password", "temporarypassword",
    "passwordhash", "senhahash", "token", "accesstoken", "refreshtoken", "resettoken", "tokenrecuperacao",
  ]);
  return Object.fromEntries(Object.entries(valor)
    .filter(([chave]) => !sensiveisTem(chave, sensiveis) || (opcoes.permitirSenhaProvisoriaUnica && String(chave).toLowerCase().replace(/[_\s-]/g, "") === "senhaprovisoria"))
    .map(([chave, conteudo]) => [chave, sanitizarResposta(conteudo, opcoes)]));
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
  return sanitizarResposta(corpoBruto, { permitirSenhaProvisoriaUnica: Boolean(opcoes.permitirSenhaProvisoriaUnica) });
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
    const papel = String(sessao?.perfil || sessao?.usuario?.papel || "").toLowerCase();
    const equipe = Boolean(sessao?.token) && ["admin", "administrador", "operador"].includes(papel);
    // A consulta é pública para visitantes e usuários comuns; só a equipe recebe o token para pedir detalhes restritos.
    if (!equipe) return requisitar(caminho, { semAutenticacao: true, naoRedirecionar401: true });
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
  perfil: async () => (await requisitar("/auth/perfil")).perfil,
  salvarPerfil: async (dados) => (await requisitar("/auth/perfil", { metodo: "PUT", corpo: dados })).perfil,
  emprestimos: async () => {
    const resposta = await requisitar("/emprestimos");
    if (!Array.isArray(resposta?.emprestimos)) throw new Error("A resposta da API de empréstimos está fora do contrato esperado. Confirme se GET /emprestimos retorna { emprestimos: [...] }.");
    return resposta.emprestimos.flatMap(normalizarEmprestimo);
  },
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
    const prazo = new Date(dados.prevista);
    const agora = new Date();
    const limite = new Date(agora); limite.setDate(limite.getDate() + 15);
    if (Number.isNaN(prazo.valueOf()) || prazo <= agora || prazo > limite) throw new Error("A devolução do empréstimo deve ser futura e ocorrer em até 15 dias.");
    const emprestimosAtuais = await ELO.emprestimos();
    if (emprestimosAtuais.some((item) => item.situacao === "atrasado" && String(item.solicitante?.id ?? "") === String(solicitanteId))) {
      throw new Error("Este solicitante tem equipamento em atraso. Regularize a devolução antes de registrar outro empréstimo.");
    }
    return requisitar("/emprestimos", { metodo: "POST", corpo: {
      solicitante_id: String(solicitanteId),
      equipamentos: (dados.equipamentos || []).map(Number),
      data_prevista_devolucao: prazo.toISOString(),
      observacoes: [dados.finalidade, dados.observacoes].filter(Boolean).join(" — ") || null,
    } });
  },
  registrarDevolucao: async (dados) => {
    const lista = (await requisitar("/emprestimos")).emprestimos || [];
    const selecoes = (dados.itens || []).map((item) => typeof item === "object" && item !== null
      ? { emprestimoId: item.emprestimoId == null ? null : String(item.emprestimoId), equipamentoId: String(item.equipamentoId ?? item.id ?? "") }
      : { emprestimoId: null, equipamentoId: String(item) });
    if (!selecoes.length || selecoes.some((item) => !item.equipamentoId)) {
      throw new Error("Selecione pelo menos um equipamento para devolver.");
    }
    const candidatos = lista.filter((emprestimo) => selecoes.some((selecao) => {
      if (selecao.emprestimoId && String(emprestimo.id) !== selecao.emprestimoId) return false;
      return (emprestimo.itens || []).some((item) => String(item.equipamento_id ?? item.equipamento?.id ?? "") === selecao.equipamentoId);
    }));
    // Se o endpoint de listagem não inclui os itens, usa o ID do empréstimo enviado pela interface.
    const idsEmprestimos = new Set([
      ...candidatos.map((item) => String(item.id)),
      ...selecoes.map((item) => item.emprestimoId).filter(Boolean),
    ]);
    if (!idsEmprestimos.size) throw new Error("Não foi possível relacionar os equipamentos selecionados aos empréstimos. Atualize a página.");
    const condicaoEscolhida = String(dados.condicao || "bom").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
    const estadoDevolucao = ({
      perfeito: "bom", bom: "bom", tudo_certo: "bom",
      incompleto: "regular", regular: "regular", falta_acessorio: "regular",
      com_avaria: "danificado", avaria: "danificado", danificado: "danificado", ha_algum_problema: "danificado",
    })[condicaoEscolhida] || "bom";
    let feitos = 0;
    const falhas = [];
    for (const idEmprestimo of idsEmprestimos) {
      let resposta;
      try {
        resposta = await requisitar(`/emprestimos/${encodeURIComponent(idEmprestimo)}`);
      } catch (erro) {
        const selecionadosDoEmprestimo = selecoes.filter((selecao) => !selecao.emprestimoId || selecao.emprestimoId === String(idEmprestimo));
        selecionadosDoEmprestimo.forEach((selecao) => falhas.push({ ...selecao, mensagem: erro.message }));
        continue;
      }
      const detalhe = resposta?.emprestimo;
      if (!detalhe) continue;
      for (const item of detalhe.itens || []) {
        const equipamentoId = String(item.equipamento_id ?? item.equipamento?.id ?? "");
        const selecionado = selecoes.some((selecao) =>
          selecao.equipamentoId === equipamentoId && (!selecao.emprestimoId || selecao.emprestimoId === String(idEmprestimo))
        );
        if (!selecionado || item.data_devolucao) continue;
        try {
          await requisitar(`/emprestimos/${encodeURIComponent(idEmprestimo)}/itens/${encodeURIComponent(equipamentoId)}/devolver`, {
            metodo: "PATCH",
            corpo: {
              estado_na_devolucao: estadoDevolucao,
              observacoes: [dados.observacoes, dados.acessoriosConferidos ? "Acessórios conferidos" : "", dados.equipamentoConferido ? "Equipamento conferido" : "", dados.assinaturaRecebida ? "Assinatura recebida" : ""].filter(Boolean).join("; ") || null,
            },
          });
          feitos += 1;
        } catch (erro) {
          falhas.push({ emprestimoId: String(idEmprestimo), equipamentoId, mensagem: erro.message });
        }
      }
    }
    if (!feitos && falhas.length) {
      throw new Error(`Nenhum item foi devolvido. ${falhas[0].mensagem || "Confira os dados e tente novamente."}`);
    }
    if (!feitos) throw new Error("Nenhum dos itens selecionados está pendente de devolução.");
    return { itens: feitos, falhas };
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
    // A API exige uma categoria já cadastrada; a foto não é guardada pela API e por isso não é enviada.
    corpo.categoria_id = Number(d.categoria_id);
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
      matricula: String(dados.matricula || "").trim() || null,
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
      matricula: String(dados.matricula || "").trim() || null,
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
  solicitarAcesso: (dados) => requisitar("/auth/solicitar-acesso", { metodo: "POST", semAutenticacao: true, naoRedirecionar401: true, corpo: {
    nome: String(dados.nome || "").trim(),
    email: String(dados.email || "").trim().toLowerCase(),
    ...(dados.tipo ? { tipo: String(dados.tipo).trim().toLowerCase() } : {}),
    ...(String(dados.matricula || "").trim() ? { matricula: String(dados.matricula).trim() } : {}),
    ...(String(dados.mensagem || "").trim() ? { mensagem: String(dados.mensagem).trim() } : {}),
  } }),
  solicitacoesAcesso: async (status = "pendente") => {
    const resposta = await requisitar(`/solicitacoes-acesso?status=${encodeURIComponent(status)}`);
    if (Array.isArray(resposta)) return resposta;
    return Array.isArray(resposta?.solicitacoes) ? resposta.solicitacoes : Array.isArray(resposta?.solicitacoes_acesso) ? resposta.solicitacoes_acesso : [];
  },
  aprovarSolicitacaoAcesso: (id, dados = {}) => requisitar(`/solicitacoes-acesso/${encodeURIComponent(String(id))}/aprovar`, {
    metodo: "POST", corpo: dados, permitirSenhaProvisoriaUnica: true,
  }),
  recusarSolicitacaoAcesso: (id, motivo = "") => requisitar(`/solicitacoes-acesso/${encodeURIComponent(String(id))}/recusar`, {
    metodo: "POST", corpo: motivo.trim() ? { motivo: motivo.trim() } : {},
  }),
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
  trocarSenha: (dados) => requisitar("/auth/trocar-senha", { metodo: "POST", corpo: { nova_senha: String(dados.nova_senha || ""), ...(dados.senha_atual ? { senha_atual: String(dados.senha_atual) } : {}) } }),
  usuarios: async () => (await requisitar("/usuarios")).usuarios,
  criarUsuario: (dados) => requisitar("/usuarios", { metodo: "POST", corpo: { nome: String(dados.nome || "").trim(), email: String(dados.email || "").trim().toLowerCase(), papel: dados.papel } }),
  reenviarSenha: (id) => requisitar(`/usuarios/${encodeURIComponent(id)}/reenviar-senha`, { metodo: "PATCH" }),
  desativarUsuario: (id) => requisitar(`/usuarios/${encodeURIComponent(id)}/desativar`, { metodo: "PATCH" }),
};
