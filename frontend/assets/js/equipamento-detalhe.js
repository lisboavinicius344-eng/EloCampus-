(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const id = new URLSearchParams(location.search).get("id");
  const box = $("detalhe");
  const erro = $("erro");

  function visual(e) {
    const tipo = ELO_VISUAIS.categoria(e.categoria);
    const cond = String(e.condicao || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const simboloEstado = cond === "bom" ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>' : cond === "regular" ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 17h.01"/><path d="m10.3 3.9-8.5 14a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3l-8.5-14a2 2 0 0 0-3.4 0Z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 6 6 14M8 6l10 10M4 20h6"/></svg>';
    const imagem = e.imagem || e.foto;
    return `<div class="equip-visual visual-${esc(cond)}" data-condicao="${esc(cond)}">
      ${imagem ? `<img src="${esc(imagem)}" alt="Foto de ${esc(e.nome)}">` : `<span class="silhueta" aria-label="Silhueta de ${esc(tipo[1])}">${tipo[0]}</span>`}
      <span class="visual-state" aria-label="Condição: ${esc(e.condicao)}">${simboloEstado}</span>
    </div>`;
  }

  if (!id) {
    erro.textContent = "Não foi informado qual equipamento deve ser exibido.";
    erro.hidden = false;
    return;
  }

  try {
    const e = await ELO.equipamento(id);
    $("editar").href = `equipamento-form.html?id=${encodeURIComponent(e.id ?? id)}`;
    document.title = `${e.nome} — ELO Campus`;
    box.innerHTML = `<div class="detalhe-layout"><div>${visual(e)}</div><div class="detalhe-copy">
      <div class="item-head"><div><h2>${esc(e.nome)}</h2><span class="muted">Patrimônio ${esc(e.patrimonio)}</span></div></div>
      <dl class="detalhe-grid">
        <div><dt>Tipo ou categoria</dt><dd>${esc(e.categoria)}</dd></div>
        <div><dt>Setor responsável</dt><dd>${esc(e.setor)}</dd></div>
        <div><dt>Condição física</dt><dd>${esc(e.condicao)}</dd></div>
        <div><dt>Situação</dt><dd>${esc(e.situacao || "Não informada")}</dd></div>
        ${e.observacoes ? `<div class="col-2"><dt>Observações</dt><dd>${esc(e.observacoes)}</dd></div>` : ""}
      </dl>
      <div class="detalhe-acoes">
        <button class="btn btn-line" id="ver-historico" type="button">Ver histórico</button>
        <button class="btn btn-danger" id="retirar" type="button">Retirar equipamento</button>
      </div>
    </div></div>
    <section class="historico-equipamento" id="historico-equipamento" hidden aria-live="polite">
      <h3>Histórico deste equipamento</h3>
      <div class="historico-equipamento-lista" id="historico-equipamento-lista"></div>
    </section>`;

    $("ver-historico").addEventListener("click", async () => {
      const botao = $("ver-historico");
      const area = $("historico-equipamento");
      const lista = $("historico-equipamento-lista");
      if (!area.hidden) { area.hidden = true; botao.textContent = "Ver histórico"; return; }
      area.hidden = false;
      lista.textContent = "Carregando movimentações…";
      botao.disabled = true;
      botao.textContent = "Consultando…";
      try {
        const movimentos = await ELO.historicoEquipamento(e.id ?? id);
        lista.replaceChildren();
        if (!movimentos.length) {
          lista.textContent = "Nenhuma movimentação registrada para este equipamento.";
        } else {
          const tabela = document.createElement("div");
          tabela.className = "table-wrap";
          const table = document.createElement("table");
          table.innerHTML = "<thead><tr><th>Data</th><th>Movimentação</th><th>Descrição</th><th>Responsável</th></tr></thead>";
          const body = document.createElement("tbody");
          movimentos.forEach((movimento) => {
            const tr = document.createElement("tr");
            const data = movimento.data_movimentacao || movimento.data || movimento.criado_em;
            const dataFormatada = data ? new Date(data).toLocaleString("pt-BR") : "—";
            [dataFormatada, movimento.tipo_movimentacao || movimento.tipo || "—", movimento.descricao || movimento.detalhe || "—", movimento.usuario_nome || movimento.usuario || movimento.responsavel || "—"].forEach((valor) => {
              const td = document.createElement("td");
              td.textContent = String(valor);
              tr.appendChild(td);
            });
            body.appendChild(tr);
          });
          table.appendChild(body); tabela.appendChild(table); lista.appendChild(tabela);
        }
        botao.textContent = "Ocultar histórico";
      } catch (falha) {
        lista.textContent = falha.message || "Não foi possível carregar o histórico.";
        botao.textContent = "Tentar novamente";
      } finally { botao.disabled = false; }
    });

    $("retirar").addEventListener("click", () => { $("modal-exclusao").hidden = false; $("confirmar-exclusao").focus(); });
    $("cancelar-exclusao").addEventListener("click", () => { $("modal-exclusao").hidden = true; });
    $("confirmar-exclusao").addEventListener("click", async () => {
      const botao = $("confirmar-exclusao");
      botao.disabled = true;
      botao.textContent = "Retirando…";
      try {
        const observacoes = document.getElementById("motivo-exclusao")?.value.trim() || "";
        if (!observacoes) { erro.textContent = "A observação é obrigatória para retirar o equipamento de uso."; erro.hidden = false; botao.disabled = false; botao.textContent = "Sim, retirar equipamento"; document.getElementById("motivo-exclusao")?.focus(); return; }
        const resultado = await ELO.removerEquipamento(id, { observacoes });
        location.href = `equipamentos.html?salvo=${resultado?.arquivado ? "arquivado" : "removido"}`;
      } catch (err) {
        $("modal-exclusao").hidden = true;
        erro.textContent = err.message;
        erro.hidden = false;
        botao.disabled = false;
        botao.textContent = "Sim, retirar equipamento";
      }
    });
  } catch (err) {
    box.replaceChildren();
    erro.textContent = err.message || "Não foi possível carregar o equipamento.";
    erro.hidden = false;
  }
})();
