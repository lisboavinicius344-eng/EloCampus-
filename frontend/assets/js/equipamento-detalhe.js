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
      <button class="btn btn-danger" id="retirar">Retirar equipamento</button>
    </div></div>`;

    $("retirar").addEventListener("click", () => { $("modal-exclusao").hidden = false; $("confirmar-exclusao").focus(); });
    $("cancelar-exclusao").addEventListener("click", () => { $("modal-exclusao").hidden = true; });
    $("confirmar-exclusao").addEventListener("click", async () => {
      const botao = $("confirmar-exclusao");
      botao.disabled = true;
      botao.textContent = "Retirando…";
      try {
        await ELO.removerEquipamento(id);
        location.href = "equipamentos.html?salvo=removido";
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
