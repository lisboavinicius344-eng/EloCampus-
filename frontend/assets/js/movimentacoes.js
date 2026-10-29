/* Histórico de movimentações: busca e intervalo aplicados aos eventos recebidos de ELO. */
(async () => {
  const box = document.getElementById("historico");
  if (!box) return;
  const $ = (id) => document.getElementById(id);
  const esc = EloUtil.esc;
  const norm = (s) => String(s ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const controls = [$("historico-busca"), $("historico-tipo"), $("historico-de"), $("historico-ate")];
  let eventos = [];
  function lerData(valor, fim = false) {
    if (!valor) return null;
    const data = new Date(`${valor}T${fim ? "23:59:59.999" : "00:00:00"}`);
    return Number.isNaN(data.getTime()) ? null : data;
  }
  function filtrar() {
    const q = norm($("historico-busca")?.value.trim());
    const tipo = $("historico-tipo")?.value || "";
    const de = lerData($("historico-de")?.value);
    const ate = lerData($("historico-ate")?.value, true);
    return eventos.filter((m) => {
      const data = new Date(m.quando);
      const texto = [m.tipo, m.equipamento?.nome, m.equipamento?.patrimonio, m.equipamento?.categoria, m.detalhe, m.por].join(" ");
      return (!q || norm(texto).includes(q)) && (!tipo || m.classe === tipo) && (!de || data >= de) && (!ate || data <= ate);
    });
  }
  function render() {
    const lista = filtrar();
    if (!lista.length) {
      box.innerHTML = `<p class="estado-vazio">${eventos.length ? "Nenhuma movimentação corresponde aos filtros selecionados." : "Nenhuma movimentação foi encontrada no sistema."}</p>`;
      return;
    }
    box.innerHTML = `<p class="muted small" style="margin-bottom:.75rem">Exibindo ${lista.length} de ${eventos.length} movimentações.</p><div class="table-wrap"><table class="table"><thead><tr><th>Data e hora</th><th>Tipo</th><th>Equipamento</th><th>Categoria</th><th>Detalhe</th><th>Responsável</th></tr></thead><tbody>${lista.map((m) => `<tr><td>${EloUtil.dataHora(m.quando)}</td><td><span class="badge badge-${esc(m.classe)}">${esc(m.tipo)}</span></td><td><strong>${esc(m.equipamento?.nome || "—")}</strong><small>${esc(m.equipamento?.patrimonio || "—")}</small></td><td><span class="category-tag">${esc(m.equipamento?.categoria || "Equipamento")}</span></td><td>${esc(m.detalhe || "—")}</td><td>${esc(m.por || "—")}</td></tr>`).join("")}</tbody></table></div>`;
  }
  try {
    eventos = await ELO.movimentacoes();
    eventos = [...eventos].sort((a, b) => new Date(b.quando) - new Date(a.quando));
    controls.filter(Boolean).forEach((control) => control.addEventListener("input", render));
    $("filtros-historico")?.addEventListener("submit", (event) => { event.preventDefault(); render(); });
    $("limpar-historico")?.addEventListener("click", () => {
      controls.filter(Boolean).forEach((control) => { control.value = ""; });
      render();
    });
    render();
  } catch (error) {
    box.innerHTML = `<p class="alert alert-error">${esc(error.message || "Não foi possível carregar o histórico.")}</p>`;
  }
})();
