/* Catálogo simplificado de autoatendimento: somente itens disponíveis. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => EloUtil.esc(value ?? "");
  const normalizar = (value) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  const busca = $("busca-disponivel");
  const categoria = $("categoria-disponivel");
  const grade = $("grade-disponiveis");
  const contagem = $("contagem-disponivel");
  const erro = $("erro-disponiveis");
  let disponiveis = [];

  function renderizar() {
    const termo = normalizar(busca.value);
    const tipo = categoria.value;
    const resultado = disponiveis.filter((item) =>
      (!termo || normalizar(`${item.nome} ${item.categoria}`).includes(termo)) &&
      (!tipo || item.categoria === tipo)
    ).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    contagem.textContent = resultado.length === 1 ? "1 item disponível" : `${resultado.length} itens disponíveis`;
    if (!resultado.length) {
      grade.innerHTML = `<div class="available-empty"><h2>${disponiveis.length ? "Não encontramos esse equipamento" : "Nenhum item disponível agora"}</h2><p>${disponiveis.length ? "Tente outro nome ou tipo de equipamento." : "Quando algum item estiver livre para empréstimo, ele aparecerá aqui."}</p>${disponiveis.length ? '<button class="btn btn-ghost" type="button" id="limpar-busca">Limpar busca</button>' : '<a class="btn btn-ghost" href="dashboard.html">Voltar ao início</a>'}</div>`;
      $("limpar-busca")?.addEventListener("click", () => { busca.value = ""; categoria.value = ""; renderizar(); busca.focus(); });
      return;
    }
    grade.innerHTML = resultado.map((item) => {
      const visual = ELO_VISUAIS.categoria(item.categoria);
      return `<article class="available-card">
        <div class="available-card-top"><span class="available-icon" aria-hidden="true">${visual[0]}</span><span class="available-status">Disponível</span></div>
        <h2>${esc(item.nome)}</h2>
        <p class="available-kind">${esc(item.categoria || "Outros")}</p>
        <p class="available-code">Código do item: ${esc(item.patrimonio)}</p>
        <a class="btn btn-primary" href="novo-emprestimo.html?equipamentoId=${encodeURIComponent(item.id)}">Reservar este item <span aria-hidden="true">→</span></a>
      </article>`;
    }).join("");
  }

  try {
    const items = await ELO.equipamentos();
    disponiveis = (Array.isArray(items) ? items : []).filter((item) => item.situacao === "disponivel");
    const tipos = [...new Set(disponiveis.map((item) => item.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    categoria.insertAdjacentHTML("beforeend", tipos.map((tipo) => `<option value="${esc(tipo)}">${esc(tipo)}</option>`).join(""));
    busca.addEventListener("input", renderizar);
    categoria.addEventListener("change", renderizar);
    renderizar();
  } catch (failure) {
    grade.innerHTML = "";
    contagem.textContent = "";
    erro.textContent = `Não foi possível carregar os equipamentos. ${failure.message || "Tente novamente."}`;
    erro.hidden = false;
  }
})();
