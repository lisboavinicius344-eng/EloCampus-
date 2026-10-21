/* Relatórios: indicadores, ranking, gráficos e exportação calculados dos dados disponíveis. */
(async () => {
  const $ = (id) => document.getElementById(id);
  const esc = EloUtil.esc;
  const norm = (s) => String(s ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const form = document.querySelector(".filters");
  if (!form) return;
  let equipamentos = [], emprestimos = [], filtrados = [];
  const equipmentById = new Map();
  const typeOf = (l) => {
    const v = norm(l.solicitante?.vinculo || "");
    if (v.startsWith("alun")) return "aluno";
    if (v.startsWith("prof")) return "professor";
    if (v.startsWith("serv")) return "servidor";
    if (v.startsWith("grupo") || v.startsWith("perfil") || v.startsWith("coord")) return "grupo";
    return "";
  };
  const escDate = (d) => d.toISOString().slice(0, 10);
  function range() {
    const now = new Date(); now.setHours(23, 59, 59, 999);
    const mode = $("periodo").value;
    let start = new Date(); start.setHours(0, 0, 0, 0);
    if (mode === "30") start.setDate(start.getDate() - 29);
    else if (mode === "6m") start.setMonth(start.getMonth() - 6);
    else if (mode === "ano") start = new Date(new Date().getFullYear(), 0, 1);
    else if (mode === "personalizado") {
      start = $("data-inicial").value ? new Date(`${$("data-inicial").value}T00:00:00`) : new Date(0);
      const end = $("data-final").value ? new Date(`${$("data-final").value}T23:59:59.999`) : now;
      return { start, end };
    }
    return { start, end: now };
  }
  function within(l, r) {
    const d = new Date(l.retirada);
    return d >= r.start && d <= r.end;
  }
  function filteredRows() {
    const r = range(), categoria = $("categoria").value, vinculo = $("vinculo").value;
    return emprestimos.filter((l) => {
      const equipamento = l.equipamento || {};
      return within(l, r) && (!categoria || equipamento.categoria === categoria) && (!vinculo || typeOf(l) === vinculo);
    });
  }
  function empty(container, text) { container.innerHTML = `<p class="muted">${text}</p>`; }
  function groupCount(list, fn) {
    const map = new Map(); list.forEach((item) => { const k = fn(item) || "Não informado"; map.set(k, (map.get(k) || 0) + 1); });
    return [...map.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  }
  function render() {
    filtrados = filteredRows();
    const encerrados = filtrados.filter((l) => l.devolvida);
    const noPrazo = encerrados.filter((l) => new Date(l.devolvida) <= new Date(l.prevista));
    $("stat-emprestimos").textContent = filtrados.length;
    $("nota-emprestimos").textContent = `${encerrados.length} devolvido(s) · ${filtrados.filter((l) => !l.devolvida).length} em aberto`;
    $("stat-prazo").textContent = encerrados.length ? `${Math.round(noPrazo.length / encerrados.length * 100)}%` : "—";
    $("stat-atrasos").textContent = filtrados.filter((l) => !l.devolvida && EloUtil.diasAtraso(l.prevista) > 0).length;
    $("stat-avarias").textContent = encerrados.filter((l) => l.condicaoDevolucao === "Com avaria").length;

    const byMonth = new Map();
    filtrados.forEach((l) => {
      const d = new Date(l.retirada); const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const label = d.toLocaleDateString("pt-BR", {month:"short"}).replace(".", "");
      const item = byMonth.get(key) || { key, label, loans: 0, returns: 0 };
      item.loans++; if (l.devolvida) item.returns++; byMonth.set(key, item);
    });
    const months = [...byMonth.values()].sort((a,b) => a.key.localeCompare(b.key)).slice(-7);
    if (!months.length) { empty($("grafico-mensal"), "Sem empréstimos no período selecionado."); $("rotulos-mensais").innerHTML = ""; }
    else {
      const max = Math.max(1, ...months.flatMap((m) => [m.loans, m.returns]));
      $("grafico-mensal").innerHTML = months.map((m) => `<div class="bar-col"><span class="bar-val">${m.loans}</span><div class="bar" style="height:${Math.max(m.loans ? 4 : 0, m.loans/max*100)}%"></div><small class="muted">${m.returns} dev.</small></div>`).join("");
      $("rotulos-mensais").innerHTML = months.map((m) => `<span>${esc(m.label)}</span>`).join("");
    }

    const ranking = groupCount(filtrados, (l) => String(l.equipamento?.id ?? l.equipamento?.patrimonio ?? ""));
    const rankRows = ranking.map(([key, count]) => {
      const itens = filtrados.filter((l) => String(l.equipamento?.id ?? l.equipamento?.patrimonio ?? "") === key);
      const l = itens[0]; const atrasos = itens.filter((x) => (x.devolvida && new Date(x.devolvida) > new Date(x.prevista)) || (!x.devolvida && EloUtil.diasAtraso(x.prevista) > 0)).length;
      return { l, count, atrasos };
    }).sort((a,b) => b.count-a.count).slice(0,8);
    $("ranking-equipamentos").innerHTML = rankRows.length ? rankRows.map(({l,count,atrasos}) => `<tr><td><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}</small></td><td>${esc(l.equipamento.categoria || "Não informada")}</td><td>${count}</td><td><span class="pill ${atrasos ? "pill-late" : "pill-ok"}">${atrasos}</span></td></tr>`).join("") : '<tr><td colspan="4" class="muted">Nenhum equipamento no período.</td></tr>';
    const categorias = groupCount(filtrados, (l) => l.equipamento?.categoria);
    $("relatorio-categorias").innerHTML = categorias.length ? categorias.map(([name,count]) => `<div><div class="hbar-head"><span>${esc(name)}</span><span>${count}</span></div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(4,count/Math.max(1,...categorias.map((x)=>x[1]))*100)}%"></div></div></div>`).join("") : '<p class="muted">Nenhuma categoria para o período.</p>';
    const vinculos = groupCount(filtrados.filter((l) => typeOf(l)), (l) => ({aluno:"Alunos",professor:"Professores",servidor:"Servidores",grupo:"Grupos e setores"}[typeOf(l)]));
    $("relatorio-vinculos").innerHTML = vinculos.length ? vinculos.map(([name,count]) => `<div><div class="hbar-head"><span>${esc(name)}</span><span>${count}</span></div><div class="hbar-track"><div class="hbar-fill" style="width:${Math.max(4,count/Math.max(1,...vinculos.map((x)=>x[1]))*100)}%"></div></div></div>`).join("") : '<p class="muted">Os registros do período não possuem vínculo informado.</p>';
  }
  function exportCsv() {
    const header = ["Empréstimo", "Solicitante", "Vínculo", "Equipamento", "Patrimônio", "Categoria", "Retirada", "Devolução prevista", "Devolvido em", "Situação", "Responsável"];
    const rows = filtrados.map((l) => [l.emprestimoId || l.id, l.solicitante?.nome, l.solicitante?.vinculo, l.equipamento?.nome, l.equipamento?.patrimonio, l.equipamento?.categoria, l.retirada ? EloUtil.dataHora(l.retirada) : "", l.prevista ? EloUtil.dataHora(l.prevista) : "", l.devolvida ? EloUtil.dataHora(l.devolvida) : "", l.devolvida ? "Devolvido" : (EloUtil.diasAtraso(l.prevista)>0 ? "Atrasado" : "Emprestado"), l.registradoPor]);
    const csv = [header, ...rows].map((row) => row.map((v) => `"${String(v ?? "").replaceAll('"','""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "relatorio-elocampus.csv"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  function atualizarPeriodo() {
    const personalizado = $("periodo").value === "personalizado";
    $("campo-data-inicial").hidden = !personalizado; $("campo-data-final").hidden = !personalizado;
  }
  form.addEventListener("submit", (event) => { event.preventDefault(); if ($("periodo").value === "personalizado" && $("data-inicial").value && $("data-final").value && $("data-final").value < $("data-inicial").value) { alert("A data final deve ser igual ou posterior à data inicial."); return; } render(); });
  $("periodo").addEventListener("change", () => { atualizarPeriodo(); render(); });
  $("categoria").addEventListener("change", render); $("vinculo").addEventListener("change", render);
  $("data-inicial").addEventListener("change", render); $("data-final").addEventListener("change", render);
  $("limpar-relatorio").addEventListener("click", () => { $("periodo").value = "30"; $("categoria").value = ""; $("vinculo").value = ""; $("data-inicial").value = ""; $("data-final").value = ""; atualizarPeriodo(); render(); });
  document.querySelectorAll(".export button").forEach((button) => button.addEventListener("click", () => { if (/CSV/i.test(button.textContent)) exportCsv(); else window.print(); }));
  try {
    [equipamentos, emprestimos] = await Promise.all([ELO.equipamentos(), ELO.emprestimos()]);
    equipamentos.forEach((e) => equipmentById.set(String(e.id), e));
    // ELO.emprestimos já entrega a relação com equipamento; valores do filtro vêm da fonte real carregada.
    const categorias = [...new Set(emprestimos.map((l) => l.equipamento?.categoria).filter(Boolean))].sort((a,b) => a.localeCompare(b,"pt-BR"));
    $("categoria").insertAdjacentHTML("beforeend", categorias.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join(""));
    atualizarPeriodo(); render();
  } catch (error) {
    const msg = `<p class="alert alert-error">${esc(error.message || "Não foi possível carregar os dados do relatório.")}</p>`;
    document.querySelector(".rel-stats")?.insertAdjacentHTML("beforebegin", msg);
  }
})();
