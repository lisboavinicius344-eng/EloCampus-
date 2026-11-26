(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const avisoEl = $("man-aviso"), tbody = $("man-tbody"), esc = EloUtil.esc;
  const buscaEquipamento = $("man-equip-busca"), opcoesEquipamento = $("man-equip-opcoes"), idEquipamento = $("man-equip");
  const buscaManutencao = $("man-busca");
  const normalizar = valor => String(valor ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let equipamentosAtuais = [];
  let manutencoesAtuais = [];

  function aviso(texto, tipo = "info") {
    avisoEl.hidden = false;
    avisoEl.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "error" ? "alert-error" : "alert-info"}`;
    avisoEl.textContent = texto;
  }
  function equipamentoAtivo(e) { return e.status !== "baixado" && e.situacao !== "inativo" && e.status !== "inativo"; }
  function rotuloEquipamento(e) { return `${e.nome} — ${e.patrimonio || e.id}`; }
  function fecharOpcoes() { opcoesEquipamento.hidden = true; buscaEquipamento.setAttribute("aria-expanded", "false"); }
  function selecionarEquipamento(id) {
    const equipamento = equipamentosAtuais.find(e => String(e.id) === String(id));
    if (!equipamento) return;
    idEquipamento.value = String(equipamento.id);
    buscaEquipamento.value = rotuloEquipamento(equipamento);
    fecharOpcoes();
  }
  function renderizarOpcoes(termo = "") {
    const normalizado = normalizar(termo).trim();
    const encontrados = equipamentosAtuais.filter(equipamentoAtivo).filter(e => !normalizado || [e.nome, e.patrimonio, e.id].some(valor => normalizar(valor).includes(normalizado))).slice(0, 40);
    opcoesEquipamento.innerHTML = encontrados.length
      ? encontrados.map(e => `<button type="button" class="man-equip-opcao" role="option" data-equipamento-id="${esc(e.id)}"><strong>${esc(e.nome)}</strong><span>${esc(e.patrimonio || `ID ${e.id}`)}</span></button>`).join("")
      : `<p class="man-equip-vazio">Nenhum equipamento encontrado.</p>`;
    opcoesEquipamento.hidden = false;
    buscaEquipamento.setAttribute("aria-expanded", "true");
  }
  function prepararBuscaEquipamento() {
    buscaEquipamento.addEventListener("focus", () => renderizarOpcoes(buscaEquipamento.value));
    buscaEquipamento.addEventListener("input", () => { idEquipamento.value = ""; renderizarOpcoes(buscaEquipamento.value); });
    buscaEquipamento.addEventListener("keydown", event => {
      if (event.key === "Escape") fecharOpcoes();
      if (event.key === "Enter" && !opcoesEquipamento.hidden) {
        const primeira = opcoesEquipamento.querySelector("[data-equipamento-id]");
        if (primeira) { event.preventDefault(); selecionarEquipamento(primeira.dataset.equipamentoId); }
      }
    });
    opcoesEquipamento.addEventListener("mousedown", event => {
      const opcao = event.target.closest("[data-equipamento-id]");
      if (opcao) { event.preventDefault(); selecionarEquipamento(opcao.dataset.equipamentoId); }
    });
    document.addEventListener("click", event => { if (!$("man-equip-picker").contains(event.target)) fecharOpcoes(); });
  }

  function encontrarEquipamento(m) {
    const nome = typeof m.equipamento === "object" ? m.equipamento?.nome : m.equipamento;
    return equipamentosAtuais.find(e =>
      (m.equipamento_id != null && String(e.id) === String(m.equipamento_id)) ||
      (m.equipamento?.id != null && String(e.id) === String(m.equipamento.id)) ||
      (nome && normalizar(e.nome).trim() === normalizar(nome).trim()) ||
      (m.numero_patrimonio && String(e.patrimonio) === String(m.numero_patrimonio))
    );
  }

  function renderizarManutencoes() {
    let rows = manutencoesAtuais.slice();
    const filtro = $("man-status").value;
    const busca = normalizar(buscaManutencao.value).trim();
    if (filtro) rows = rows.filter(x => x.status === filtro);
    if (busca) rows = rows.filter(m => {
      const equipamento = encontrarEquipamento(m);
      const nome = typeof m.equipamento === "object" ? m.equipamento?.nome : m.equipamento;
      const texto = [nome, equipamento?.nome, m.numero_patrimonio, equipamento?.patrimonio, m.descricao_problema, m.status].join(" ");
      return normalizar(texto).includes(busca);
    });
    tbody.replaceChildren();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6">${manutencoesAtuais.length ? "Nenhuma manutenção corresponde aos filtros." : "Nenhuma manutenção para exibir."}</td></tr>`;
      return;
    }
    rows.forEach(m => {
      const equipamento = encontrarEquipamento(m);
      const nome = m.equipamento?.nome || m.equipamento || equipamento?.nome || "—";
      const patrimonio = m.numero_patrimonio || equipamento?.patrimonio || "—";
      const tr = document.createElement("tr");
      tr.innerHTML = `<td class="man-equipamento-cell"><strong>${esc(nome)}</strong></td>
        <td class="man-patrimonio-cell">${esc(patrimonio)}</td>
        <td class="man-problema-cell">${esc(m.descricao_problema || "—")}</td>
        <td>${esc(m.data_abertura ? new Date(m.data_abertura).toLocaleString("pt-BR") : "—")}</td>
        <td><span class="man-status man-status-${esc(m.status || "")}">${esc(m.status || "—")}</span></td>
        <td class="man-acoes-cell"><div class="man-acao-card"></div></td>`;
      const actions = tr.querySelector(".man-acao-card");
      if (["aberta", "em_andamento"].includes(m.status)) {
        const titulo = document.createElement("strong"); titulo.className = "man-acao-titulo"; titulo.textContent = "Concluir manutenção";
        const solucao = document.createElement("textarea"); solucao.className = "input input-block"; solucao.rows = 3; solucao.maxLength = 1000; solucao.placeholder = "Descreva a solução aplicada"; solucao.setAttribute("aria-label", "Solução aplicada");
        const label = document.createElement("label"); label.textContent = "Estado após a manutenção";
        const estado = document.createElement("select"); estado.className = "input input-block";
        [["bom", "Bom"], ["novo", "Novo"], ["regular", "Regular"]].forEach(([v, t]) => estado.add(new Option(t, v)));
        const finalizar = document.createElement("button"); finalizar.className = "btn btn-primary man-finalizar"; finalizar.type = "button"; finalizar.textContent = "Finalizar manutenção";
        finalizar.addEventListener("click", async () => {
          if (!solucao.value.trim()) { aviso("Descreva a solução aplicada antes de finalizar.", "error"); solucao.focus(); return; }
          finalizar.disabled = true;
          try { const r = await ELO.finalizarManutencao(m.id, { solucao: solucao.value.trim(), estado_conservacao: estado.value }); aviso(r?.mensagem || "Manutenção finalizada.", "ok"); await carregar(); }
          catch (e) { aviso(e.message || "Não foi possível finalizar a manutenção.", "error"); finalizar.disabled = false; }
        });
        actions.append(titulo, solucao, label, estado, finalizar);
      } else {
        const concluida = document.createElement("span"); concluida.className = "man-acao-concluida"; concluida.textContent = m.status === "concluida" ? "Manutenção concluída" : "Sem ações disponíveis"; actions.append(concluida);
      }
      tbody.append(tr);
    });
  }

  async function carregar() {
    try {
      const [manutencoes, equipamentos] = await Promise.all([ELO.manutencoes(), ELO.equipamentos()]);
      manutencoesAtuais = Array.isArray(manutencoes) ? manutencoes : [];
      equipamentosAtuais = Array.isArray(equipamentos) ? equipamentos : [];
      idEquipamento.value = ""; buscaEquipamento.value = "";
      renderizarManutencoes();
    } catch (e) { tbody.innerHTML = `<tr><td colspan="6">${esc(e.message || "Falha ao carregar manutenções.")}</td></tr>`; }
  }

  prepararBuscaEquipamento();
  buscaManutencao.addEventListener("input", renderizarManutencoes);
  $("man-form").addEventListener("submit", async event => {
    event.preventDefault();
    const equipamento = equipamentosAtuais.find(e => String(e.id) === String(idEquipamento.value));
    const descricao = $("man-desc").value.trim();
    if (!equipamento || !descricao) return aviso("Selecione o equipamento e descreva o problema.", "error");
    const inativar = $("man-inativar")?.checked === true;
    const motivoInativacao = $("man-motivo-inativacao")?.value.trim() || "Inativado durante abertura de manutenção.";
    if (inativar && !$("man-motivo-inativacao")?.value.trim()) { aviso("Informe o motivo da inativação ou desmarque essa opção.", "error"); $("man-motivo-inativacao")?.focus(); return; }
    const resumoInativacao = inativar ? `\n\nATENÇÃO: além de abrir a manutenção, o equipamento será INATIVADO e deixará de integrar o acervo disponível.\nMotivo: ${motivoInativacao}` : "\n\nO equipamento ficará indisponível enquanto estiver em manutenção, mas continuará ativo no acervo.";
    if (!window.confirm(`Enviar ${equipamento.nome} para manutenção?\n\nProblema: ${descricao}${resumoInativacao}`)) return;
    if (!window.confirm(inativar ? "Confirmação final: registrar a manutenção E inativar permanentemente este equipamento?" : "Confirmação final: registrar a manutenção deste equipamento?")) return;
    const submit = $("man-form").querySelector('[type="submit"]'); submit.disabled = true;
    try {
      const r = await ELO.abrirManutencao({ equipamento_id: Number(equipamento.id), descricao_problema: descricao });
      if (inativar) { try { await ELO.removerEquipamento(String(equipamento.id), { observacoes: motivoInativacao }); aviso("Manutenção aberta e equipamento inativado.", "ok"); } catch (e) { aviso(`A manutenção foi aberta, mas não foi possível inativar o equipamento: ${e.message || "erro na API"}.`, "error"); } }
      else aviso(r?.mensagem || "Equipamento enviado para manutenção.", "ok");
      idEquipamento.value = ""; buscaEquipamento.value = ""; $("man-desc").value = ""; if ($("man-inativar")) $("man-inativar").checked = false; if ($("man-motivo-inativacao")) $("man-motivo-inativacao").value = ""; if ($("man-inativacao-wrap")) $("man-inativacao-wrap").hidden = true;
      await carregar();
    } catch (e) { aviso(e.message || "Não foi possível enviar o equipamento para manutenção.", "error"); }
    finally { submit.disabled = false; }
  });
  $("man-inativar")?.addEventListener("change", () => { const wrap = $("man-inativacao-wrap"), motivo = $("man-motivo-inativacao"); if (wrap) wrap.hidden = !$("man-inativar").checked; if (motivo) motivo.required = $("man-inativar").checked; });
  $("man-status").addEventListener("change", renderizarManutencoes);
  $("man-refresh").addEventListener("click", carregar);
  carregar();
})();
