/* Administração de solicitações de acesso: análise rápida, ações explícitas e auditoria. */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const lista = $("solicitacoes-lista");
  const aviso = $("solicitacoes-aviso");
  const atualizar = $("solicitacoes-atualizar");
  const busca = $("solicitacoes-busca");
  const tabs = [...document.querySelectorAll("[data-access-view]")];
  if (!lista) return;

  const esc = (v) => EloUtil.esc(v ?? "—");
  let ocupada = false;
  let visaoAtual = "pendente";
  let pedidosAtuais = [];

  function informar(texto, tipo = "info") {
    aviso.textContent = texto;
    aviso.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "error" ? "alert-error" : "alert-info"}`;
    aviso.hidden = false;
  }

  function normalizarStatus(pedido) {
    return String(pedido?.status || pedido?.situacao || "pendente").toLowerCase().replace(/[_\s-]+/g, "_");
  }

  function statusInfo(pedido) {
    const status = normalizarStatus(pedido);
    if (["aprovada", "aprovado", "approved"].includes(status)) return { texto: "Aprovada", classe: "pill-ok" };
    if (["recusada", "rejeitada", "rejeitado", "denied", "refused"].includes(status)) return { texto: "Recusada", classe: "pill-late" };
    return { texto: "Pendente", classe: "pill-warn" };
  }

  function nomeSolicitante(pedido) {
    return pedido.nome || pedido.solicitante_nome || pedido.email || "Solicitante não informado";
  }

  function dataPedido(pedido) {
    const valor = pedido.criado_em || pedido.created_at || pedido.data_solicitacao;
    return valor ? new Date(valor).toLocaleString("pt-BR") : "Data não informada";
  }

  function dataDecisao(pedido) {
    const valor = pedido.decidido_em || pedido.data_decisao || pedido.analisado_em || pedido.updated_at;
    return valor ? new Date(valor).toLocaleString("pt-BR") : "Data da decisão não informada";
  }

  function responsavelDecisao(pedido) {
    return pedido.analisado_por_nome || pedido.responsavel_nome || pedido.responsavel || pedido.analisado_por || pedido.aprovado_por || pedido.recusado_por || pedido.usuario_nome || "Responsável não informado";
  }


  function inputField(labelText, name, value = "", required = false, type = "text") {
    const wrap = document.createElement("div");
    wrap.className = "field";
    const label = document.createElement("label");
    label.textContent = labelText;
    label.htmlFor = `access-${name}`;
    const input = document.createElement(type === "textarea" ? "textarea" : "input");
    input.id = `access-${name}`;
    input.name = name;
    input.className = "input input-block";
    input.value = value == null ? "" : String(value);
    input.required = required;
    input.maxLength = ["mensagem", "justificativa", "motivo"].includes(name) ? 1000 : 160;
    if (type !== "textarea") input.type = type;
    wrap.append(label, input);
    return { wrap, input };
  }

  function montarCabecalho(card, pedido, auditoria = false) {
    const head = document.createElement("div");
    head.className = "access-card-head";
    const ident = document.createElement("div");
    const h = document.createElement("h2");
    h.textContent = nomeSolicitante(pedido);
    const meta = document.createElement("p");
    meta.className = "access-meta";
    meta.textContent = [
      pedido.email || "E-mail não informado",
      pedido.tipo || "Vínculo não informado",
      pedido.matricula ? `Matrícula/SIAPE: ${pedido.matricula}` : "",
      auditoria ? `Solicitada em ${dataPedido(pedido)}` : `Recebida em ${dataPedido(pedido)}`,
    ].filter(Boolean).join(" · ");
    ident.append(h, meta);
    const status = statusInfo(pedido);
    const pill = document.createElement("span");
    pill.className = `pill ${status.classe}`;
    pill.textContent = status.texto;
    head.append(ident, pill);
    card.append(head);
  }

  function montarAuditoriaTabela(pedidos) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap access-audit-wrap";
    const table = document.createElement("table");
    table.className = "table access-audit-table";
    table.innerHTML = `<thead><tr><th>Pessoa</th><th>E-mail</th><th>Tipo</th><th>Status</th><th>Analisado por</th><th>Data e hora</th><th>Justificativa</th></tr></thead>`;
    const tbody = document.createElement("tbody");
    pedidos.forEach((pedido) => {
      const tr = document.createElement("tr");
      const status = statusInfo(pedido);
      const valores = [
        nomeSolicitante(pedido),
        pedido.email || "—",
        pedido.tipo || pedido.vinculo || "—",
        status.texto,
        pedido.analisado_por_nome || responsavelDecisao(pedido),
        pedido.analisado_em ? new Date(pedido.analisado_em).toLocaleString("pt-BR") : dataDecisao(pedido),
        pedido.justificativa || pedido.motivo_recusa || "—",
      ];
      valores.forEach((valor, indice) => {
        const td = document.createElement("td");
        td.dataset.label = ["Pessoa", "E-mail", "Tipo", "Status", "Analisado por", "Data e hora", "Justificativa"][indice];
        if (indice === 3) {
          const pill = document.createElement("span");
          pill.className = `pill ${status.classe}`;
          pill.textContent = valor;
          td.append(pill);
        } else {
          td.textContent = valor;
        }
        tr.append(td);
      });
      tbody.append(tr);
    });
    table.append(tbody);
    wrap.append(table);
    return wrap;
  }


  function montarPendente(pedido) {
    const card = document.createElement("article");
    card.className = "card access-card";
    montarCabecalho(card, pedido);
    if (pedido.mensagem) {
      const msg = document.createElement("p"); msg.className = "access-request-message"; msg.textContent = `Mensagem enviada: ${pedido.mensagem}`; card.append(msg);
    }
    const fields = document.createElement("div");
    fields.className = "access-fields";
    const tipoField = document.createElement("div");
    tipoField.className = "field";
    const tipoLabel = document.createElement("label");
    tipoLabel.htmlFor = `access-tipo-${pedido.id}`;
    tipoLabel.textContent = "Vínculo";
    const tipoSelect = document.createElement("select");
    tipoSelect.id = tipoLabel.htmlFor;
    tipoSelect.name = "tipo";
    tipoSelect.className = "input input-block";
    [["", "Selecione o vínculo"], ["aluno", "Aluno"], ["professor", "Professor"]].forEach(([v, t]) => tipoSelect.add(new Option(t, v)));
    if (["aluno", "professor"].includes(pedido.tipo)) tipoSelect.value = pedido.tipo;
    tipoSelect.required = !pedido.tipo;
    tipoField.append(tipoLabel, tipoSelect);
    fields.append(tipoField);
    const nomeField = inputField("Nome do solicitante", "nome", pedido.nome || "", false);
    const matField = inputField("Matrícula / SIAPE", "matricula", pedido.matricula || "", false);
    const setorField = inputField("Setor / curso", "setor", pedido.setor || "", false);
    const telField = inputField("Telefone", "telefone", pedido.telefone || "", false, "tel");
    const justificativaField = inputField("Justificativa (opcional)", "justificativa", "", false, "textarea");
    justificativaField.input.placeholder = "Registre o motivo da decisão, se necessário…";
    [nomeField, matField, setorField, telField, justificativaField].forEach((field) => fields.append(field.wrap));
    card.append(fields);

    const actions = document.createElement("div");
    actions.className = "access-actions";
    const approve = document.createElement("button");
    approve.type = "button";
    approve.className = "btn btn-primary";
    approve.textContent = "Aprovar acesso";
    const reject = document.createElement("button");
    reject.type = "button";
    reject.className = "btn btn-ghost";
    reject.textContent = "Recusar";
    approve.addEventListener("click", async () => {
      if (ocupada) return;
      if (!tipoSelect.value) { informar("Selecione Aluno ou Professor antes de aprovar.", "error"); tipoSelect.focus(); return; }
      const confirmada = window.confirm(`Confirma a aprovação do acesso de ${nomeField.input.value.trim() || nomeSolicitante(pedido)}?\n\nVínculo: ${tipoSelect.value === "aluno" ? "Aluno" : "Professor"}\nE-mail: ${pedido.email || "não informado"}\n\nA conta será criada e a pessoa receberá as instruções por e-mail.`);
      if (!confirmada) return;
      const payload = { tipo: tipoSelect.value };
      if (nomeField.input.value.trim()) payload.nome = nomeField.input.value.trim();
      if (matField.input.value.trim()) payload.matricula = matField.input.value.trim();
      if (setorField.input.value.trim()) payload.setor = setorField.input.value.trim();
      if (telField.input.value.trim()) payload.telefone = telField.input.value.trim();
      if (justificativaField.input.value.trim()) payload.justificativa = justificativaField.input.value.trim();
      ocupada = true; approve.disabled = true; reject.disabled = true;
      try {
        const result = await ELO.aprovarSolicitacaoAcesso(pedido.id, payload);
        informar(result?.mensagem || "Solicitação aprovada.", "ok");
        if (result?.email_enviado === false) informar("Solicitação aprovada, mas o e-mail não foi enviado. Reenvie as instruções em Equipe do sistema.", "info");
        await atualizarContador();
        await carregar();
      } catch (e) { informar(e.message || "Não foi possível aprovar a solicitação.", "error"); approve.disabled = false; reject.disabled = false; }
      finally { ocupada = false; }
    });
    reject.addEventListener("click", async () => {
      if (ocupada) return;
      const motivo = justificativaField.input.value.trim();
      if (!motivo) {
        justificativaField.wrap.querySelector("label").textContent = "Motivo da recusa (obrigatório)";
        informar("Informe o motivo da recusa antes de continuar.", "error");
        justificativaField.input.focus();
        return;
      }
      if (!window.confirm(`Recusar a solicitação de ${nomeSolicitante(pedido)}?\n\nMotivo: ${motivo}`)) return;
      ocupada = true; reject.disabled = true; approve.disabled = true;
      try { const result = await ELO.recusarSolicitacaoAcesso(pedido.id, motivo); informar(result?.mensagem || "Solicitação recusada.", "ok"); await atualizarContador(); await carregar(); }
      catch (e) { informar(e.message || "Não foi possível recusar a solicitação.", "error"); approve.disabled = false; reject.disabled = false; }
      finally { ocupada = false; }
    });
    actions.append(approve, reject);
    card.append(actions);
    return card;
  }

  function atualizarAbas() {
    tabs.forEach((tab) => {
      const ativo = tab.dataset.accessView === visaoAtual;
      tab.classList.toggle("is-active", ativo);
      tab.setAttribute("aria-selected", String(ativo));
    });
  }

  function renderizar() {
    const termo = String(busca?.value || "").trim().toLocaleLowerCase("pt-BR");
    const filtrados = pedidosAtuais.filter((pedido) => !termo || [pedido.nome, pedido.email, pedido.tipo, pedido.matricula, pedido.setor, pedido.analisado_por_nome, pedido.justificativa, pedido.motivo_recusa].join(" ").toLocaleLowerCase("pt-BR").includes(termo));
    lista.replaceChildren();
    if (!filtrados.length) {
      const vazio = document.createElement("div");
      vazio.className = "card access-empty";
      vazio.innerHTML = visaoAtual === "pendente" ? "<strong>Nenhuma solicitação pendente.</strong><span>Quando um novo pedido chegar, ele aparecerá aqui para análise.</span>" : "<strong>Nenhuma decisão encontrada.</strong><span>A auditoria das aprovações e recusas aparecerá nesta área.</span>";
      lista.append(vazio);
      return;
    }
    if (visaoAtual === "auditoria") {
      lista.append(montarAuditoriaTabela(filtrados));
    } else {
      filtrados.forEach((pedido) => lista.append(montarPendente(pedido)));
    }
  }

  async function carregarAuditoria() {
    const pedidos = await ELO.solicitacoesAcesso(null);
    return pedidos.filter((pedido) => ["aprovada", "aprovado", "approved", "recusada", "rejeitada", "rejeitado", "denied", "refused"].includes(normalizarStatus(pedido)));
  }

  async function atualizarContador() {
    const contador = $("solicitacoes-pendentes-count");
    const total = $("pendentes-total");
    try {
      const pendentes = await ELO.solicitacoesAcesso("pendente");
      if (contador) { contador.textContent = String(pendentes.length); contador.hidden = pendentes.length === 0; contador.setAttribute("aria-label", `${pendentes.length} solicitações pendentes`); }
      if (total) total.textContent = String(pendentes.length);
      return pendentes;
    } catch { return []; }
  }

  async function carregar() {
    atualizar.disabled = true;
    atualizar.textContent = "Atualizando…";
    lista.innerHTML = `<div class="card access-loading">${visaoAtual === "pendente" ? "Consultando pedidos pendentes…" : "Consultando histórico de decisões…"}</div>`;
    try {
      pedidosAtuais = visaoAtual === "pendente" ? await ELO.solicitacoesAcesso("pendente") : await carregarAuditoria();
      const total = $(visaoAtual === "pendente" ? "pendentes-total" : "auditoria-total");
      if (total) total.textContent = String(pedidosAtuais.length);
      atualizarAbas();
      renderizar();
      informar(visaoAtual === "pendente" ? "Lista de pendências atualizada." : "Auditoria atualizada.", "ok");
    } catch (e) {
      lista.innerHTML = `<div class="card access-empty"><strong>Não foi possível carregar esta visão.</strong><span>${esc(e.message || "Tente atualizar a lista.")}</span></div>`;
      informar(e.message || "Não foi possível carregar as solicitações.", "error");
    } finally {
      atualizar.disabled = false;
      atualizar.textContent = "Atualizar lista";
    }
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => { if (ocupada || tab.dataset.accessView === visaoAtual) return; visaoAtual = tab.dataset.accessView; carregar(); }));
  busca?.addEventListener("input", renderizar);
  atualizar.addEventListener("click", carregar);
  atualizarContador().finally(carregar);
})();
