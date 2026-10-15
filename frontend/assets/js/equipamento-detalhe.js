/* Detalhes do equipamento: os dados são sempre carregados pela API/camada ELO. */
(async function () {
  const $ = (id) => document.getElementById(id), esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const id = new URLSearchParams(location.search).get("id"), detalhe = $("detalhe"), erro = $("erro");
  if (!id) { erro.textContent = "Não foi informado qual equipamento deve ser exibido."; erro.hidden = false; detalhe.replaceChildren(); return; }
  try {
    const e = await ELO.equipamento(id); const s = e.situacao || "";
    $("editar").href = `equipamento-form.html?id=${encodeURIComponent(e.id ?? id)}`;
    document.title = `${e.nome || "Equipamento"} — ELO Campus`;
    detalhe.innerHTML = `<div class="item-head detalhe-head"><div class="item-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18H6zM12 14a3 3 0 1 0 0 .01M12 7h.01"/></svg></div><div><h2>${esc(e.nome)}</h2><span class="muted">${esc(e.patrimonio)}</span></div></div>${e.imagem || e.foto ? `<img class="detalhe-foto" src="${esc(e.imagem || e.foto)}" alt="Foto de ${esc(e.nome)}">` : ""}<dl class="detalhe-grid"><div><dt>Tipo ou categoria</dt><dd>${esc(e.categoria)}</dd></div><div><dt>Setor responsável</dt><dd>${esc(e.setor)}</dd></div><div><dt>Condição física</dt><dd>${esc(e.condicao)}</dd></div><div><dt>Situação</dt><dd>${esc(s || "Não informada")}</dd></div>${e.observacoes ? `<div class="col-2"><dt>Observações</dt><dd>${esc(e.observacoes)}</dd></div>` : ""}</dl>`;
  } catch (e) { detalhe.replaceChildren(); erro.textContent = e.message || "Não foi possível carregar o equipamento."; erro.hidden = false; }
})();
