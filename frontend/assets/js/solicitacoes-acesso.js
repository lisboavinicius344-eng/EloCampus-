/* Administração de solicitações de acesso. Senha provisória nunca é persistida. */
"use strict";
(() => {
  const $ = (id) => document.getElementById(id);
  const lista = $("solicitacoes-lista"), aviso = $("solicitacoes-aviso"), atualizar = $("solicitacoes-atualizar");
  if (!lista) return;
  const esc = (v) => EloUtil.esc(v ?? "—");
  let ocupada = false;
  let statusAtual = "pendente";
  function informar(texto, tipo = "info") { aviso.textContent = texto; aviso.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "error" ? "alert-error" : "alert-info"}`; aviso.hidden = false; }
  function inputField(labelText, name, value = "", required = false, type = "text") {
    const wrap = document.createElement("div"); wrap.className = "field";
    const label = document.createElement("label"); label.textContent = labelText; label.htmlFor = `access-${name}`;
    const input = document.createElement(type === "textarea" ? "textarea" : "input"); input.id = `access-${name}`; input.name = name; input.className = "input input-block"; input.value = value == null ? "" : String(value); input.required = required; input.maxLength = name === "mensagem" ? 1000 : 120;
    if (type !== "textarea") input.type = type;
    wrap.append(label, input); return { wrap, input };
  }
  async function atualizarContador() {
    const contador = document.getElementById("solicitacoes-pendentes-count");
    if (!contador) return;
    try { const pedidos = await ELO.solicitacoesAcesso("pendente"); contador.textContent = String(pedidos.length); contador.hidden = pedidos.length === 0; contador.setAttribute("aria-label", `${pedidos.length} solicitações pendentes`); } catch { /* o menu não deve falhar por causa do contador */ }
  }
  async function carregar(status = statusAtual) {
    statusAtual = status;
    atualizar.disabled = true; atualizar.textContent = "Atualizando…"; lista.replaceChildren();
    const loading = document.createElement("div"); loading.className = "card"; loading.textContent = status === "auditoria" ? "Consultando histórico…" : "Consultando pedidos pendentes…"; lista.append(loading);
    try {
      const pedidos = status === "auditoria" ? (await Promise.all([ELO.solicitacoesAcesso("aprovada"), ELO.solicitacoesAcesso("recusada")])).flat() : await ELO.solicitacoesAcesso("pendente"); lista.replaceChildren();
      if (!pedidos.length) { const vazio = document.createElement("div"); vazio.className = "card"; vazio.textContent = status === "auditoria" ? "Ainda não há registros de auditoria." : "Não há solicitações de acesso pendentes."; lista.append(vazio); informar("Lista atualizada.", "ok"); return; }
      pedidos.forEach((pedido) => {
        const card = document.createElement("article"); card.className = "card access-card";
        const head = document.createElement("div"); head.className = "access-card-head";
        const ident = document.createElement("div"); const h = document.createElement("h2"); h.textContent = pedido.nome || "Nome não informado"; h.style.margin = "0";
        const meta = document.createElement("p"); meta.className = "access-meta"; meta.textContent = [pedido.email, pedido.tipo || "Vínculo não informado", pedido.matricula ? `Matrícula/SIAPE: ${pedido.matricula}` : "", pedido.criado_em ? `Recebida em ${new Date(pedido.criado_em).toLocaleString("pt-BR")}` : ""].filter(Boolean).join(" · "); ident.append(h, meta);
        const statusPill = document.createElement("span"); statusPill.className = `pill ${status === "auditoria" ? (pedido.status === "aprovada" ? "pill-ok" : "pill-late") : "pill-warn"}`; statusPill.textContent = status === "auditoria" ? (pedido.status === "aprovada" ? "Aprovada" : "Recusada") : "Pendente"; head.append(ident, statusPill); card.append(head);
        if (status === "auditoria") { const auditoria = document.createElement("p"); auditoria.className = "muted"; auditoria.textContent = `Analisado por: ${pedido.analisado_por_nome || "—"} · ${pedido.analisado_em ? new Date(pedido.analisado_em).toLocaleString("pt-BR") : "data não informada"} · Justificativa: ${pedido.justificativa || pedido.motivo || "—"}`; card.append(auditoria); lista.append(card); return; }
        if (pedido.mensagem) { const msg = document.createElement("p"); msg.textContent = `Mensagem: ${pedido.mensagem}`; card.append(msg); }
        const fields = document.createElement("div"); fields.className = "access-fields";
        const tipoField = document.createElement("div"); tipoField.className = "field"; const tipoLabel = document.createElement("label"); tipoLabel.htmlFor = `access-tipo-${pedido.id}`; tipoLabel.textContent = "Vínculo"; const tipoSelect = document.createElement("select"); tipoSelect.id = tipoLabel.htmlFor; tipoSelect.name = "tipo"; tipoSelect.className = "input input-block"; [["", "Selecione o vínculo"],["aluno","Aluno"],["professor","Professor"]].forEach(([v,t]) => { const o = new Option(t,v); tipoSelect.add(o); }); if (["aluno","professor"].includes(pedido.tipo)) tipoSelect.value = pedido.tipo; tipoSelect.required = !pedido.tipo; tipoField.append(tipoLabel,tipoSelect); fields.append(tipoField);
        const nomeField = inputField("Nome", "nome", pedido.nome || "", false); const matField = inputField("Matrícula / SIAPE", "matricula", pedido.matricula || "", false); const setorField = inputField("Setor / curso", "setor", pedido.setor || "", false); const telField = inputField("Telefone", "telefone", pedido.telefone || "", false, "tel");
        const justificativaField = inputField("Justificativa (opcional)", "justificativa", "", false, "textarea");
        [nomeField,matField,setorField,telField,justificativaField].forEach((f)=>fields.append(f.wrap)); card.append(fields);
        const actions = document.createElement("div"); actions.className = "access-actions";
        const approve = document.createElement("button"); approve.type = "button"; approve.className = "btn btn-primary"; approve.textContent = "Aprovar acesso";
        approve.addEventListener("click", async () => {
          if (ocupada) return;
          if (!tipoSelect.value) { informar("Selecione Aluno ou Professor antes de aprovar.", "error"); tipoSelect.focus(); return; }
          const payload = {};
          if (tipoSelect.value) payload.tipo = tipoSelect.value;
          if (nomeField.input.value.trim()) payload.nome = nomeField.input.value.trim();
          if (matField.input.value.trim()) payload.matricula = matField.input.value.trim();
          if (setorField.input.value.trim()) payload.setor = setorField.input.value.trim();
          if (telField.input.value.trim()) payload.telefone = telField.input.value.trim();
          if (justificativaField.input.value.trim()) payload.justificativa = justificativaField.input.value.trim();
          ocupada = true; approve.disabled = true;
          try {
            const result = await ELO.aprovarSolicitacaoAcesso(pedido.id, payload);
            card.replaceChildren(); const done = document.createElement("div"); done.className = "access-card";
            const text = document.createElement("p"); text.textContent = result?.mensagem || "Solicitação aprovada."; done.append(text);
            // O backend não devolve mais senha provisória; se o e-mail falhar, use "Reenviar instruções".
            if (result?.email_enviado === false) { const note = document.createElement("p"); note.textContent = "O e-mail não foi enviado. Depois de corrigir o envio, use “Reenviar instruções” em Equipe do sistema para mandar o acesso a essa pessoa."; done.append(note); }
            card.append(done); informar("Solicitação aprovada.", "ok"); await atualizarContador();
          } catch (e) { informar(e.message || "Não foi possível aprovar a solicitação.", "error"); approve.disabled = false; }
          finally { ocupada = false; }
        });
        const reject = document.createElement("button"); reject.type = "button"; reject.className = "btn btn-ghost"; reject.textContent = "Recusar";
        reject.addEventListener("click", async () => { if (ocupada) return; const motivo = window.prompt("Motivo obrigatório da recusa:", ""); if (motivo === null || !motivo.trim()) { informar("Informe o motivo da recusa.", "error"); return; } if (!window.confirm(`Recusar a solicitação de ${pedido.nome || pedido.email}?`)) return; ocupada = true; reject.disabled = true; try { const r = await ELO.recusarSolicitacaoAcesso(pedido.id, motivo); informar(r?.mensagem || "Solicitação recusada.", "ok"); await atualizarContador(); await carregar(statusAtual); } catch (e) { informar(e.message || "Não foi possível recusar a solicitação.", "error"); reject.disabled = false; } finally { ocupada = false; } });
        actions.append(approve, reject); card.append(actions); lista.append(card);
      });
      aviso.hidden = true;
    } catch (e) { lista.replaceChildren(); const erro = document.createElement("div"); erro.className = "card"; erro.textContent = e.message || "Não foi possível carregar as solicitações."; lista.append(erro); informar(erro.textContent, "error"); }
    finally { atualizar.disabled = false; atualizar.textContent = "Atualizar lista"; }
  }
  document.querySelectorAll("[data-status]").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll("[data-status]").forEach((item) => item.setAttribute("aria-selected", String(item === tab))); carregar(tab.dataset.status); }));
  atualizar.addEventListener("click", () => carregar(statusAtual)); carregar();
})();
