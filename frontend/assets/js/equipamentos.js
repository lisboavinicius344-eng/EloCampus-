/* ELO Campus — listagem de equipamentos
 * Busca e filtros rodam no navegador sobre a lista recebida da API.
 * Com muitos itens, mover filtros e paginação para o back-end
 * (ex.: GET /api/equipamentos?busca=&situacao=&pagina=). */

(async function () {
  const $ = (id) => document.getElementById(id);
  const { esc } = EloUtil;

  const SITUACOES = {
    disponivel: { rotulo: "Disponível",    cls: "ok" },
    emprestado: { rotulo: "Emprestado",    cls: "loan" },
    atrasado:   { rotulo: "Atrasado",      cls: "late" },
    manutencao: { rotulo: "Em manutenção", cls: "maint" },
    inativo:    { rotulo: "Inativo",       cls: "off" },
  };

  const norm = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const unicos = (lista, campo) => [...new Set(lista.map((e) => e[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const opcoes = (select, valores) => {
    select.insertAdjacentHTML("beforeend", valores.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join(""));
  };

  const campos = {
    busca: $("f-busca"),
    situacao: $("f-situacao"),
    categoria: $("f-categoria"),
    setor: $("f-setor"),
    condicao: $("f-condicao"),
    ordem: $("f-ordem"),
  };

  const TAMANHO_PAGINA = 10;
  let todos = [];
  let quantidadeVisivel = TAMANHO_PAGINA;
  let observadorCarregamento = null;
  // IDs marcados para impressão de etiquetas; a seleção sobrevive a filtros e buscas.
  const selecionados = new Set();

  function atualizarBotaoEtiquetas() {
    const botao = $("imprimir-etiquetas");
    if (!botao) return;
    const ids = [...selecionados];
    botao.href = ids.length ? `etiquetas.html?ids=${ids.map(encodeURIComponent).join(",")}` : "etiquetas.html";
    botao.textContent = ids.length
      ? `Imprimir etiquetas (${ids.length} ${ids.length === 1 ? "selecionada" : "selecionadas"})`
      : "Imprimir etiquetas";
    botao.title = ids.length ? "Imprime só os equipamentos marcados." : "Imprime todos os equipamentos que não foram baixados.";
  }

  function filtrar() {
    const termo = norm(campos.busca.value.trim());
    return todos.filter((e) =>
      (!termo || norm(e.nome).includes(termo) || norm(e.patrimonio).includes(termo)) &&
      (!campos.situacao.value || e.situacao === campos.situacao.value) &&
      (!campos.categoria.value || e.categoria === campos.categoria.value) &&
      (!campos.setor.value || e.setor === campos.setor.value) &&
      (!campos.condicao.value || e.condicao === campos.condicao.value)
    );
  }

  function atualizarEstadoSelecaoCabecalho() {
    const cabecalho = $("lista").querySelector("[data-selecionar-todos]");
    if (!cabecalho) return;
    const resultado = filtrar();
    const marcados = resultado.filter((e) => selecionados.has(String(e.id))).length;
    cabecalho.checked = resultado.length > 0 && marcados === resultado.length;
    cabecalho.indeterminate = marcados > 0 && marcados < resultado.length;
  }

  function linhaEquipamento(e) {
    const s = SITUACOES[e.situacao] || { rotulo: e.situacao, cls: "off" };
    const cond = norm(e.condicao);
    const visual = ELO_VISUAIS.categoria(e.categoria);
    const href = `equipamento-detalhe.html?id=${encodeURIComponent(e.id)}`;
    return `<tr>
      <td class="col-selecao"><input type="checkbox" data-selecionar="${esc(e.id)}" aria-label="Selecionar ${esc(e.nome)} para etiqueta"${selecionados.has(String(e.id)) ? " checked" : ""}></td>
      <td class="cell-nome"><span class="eq-mini eq-cond-${esc(cond)}" title="${esc(visual[1])}">${visual[0]}</span><a class="link-item" href="${href}">${esc(e.nome)}</a></td>
      <td data-label="Patrimônio">${esc(e.patrimonio)}</td>
      <td data-label="Categoria">${esc(e.categoria)}</td>
      <td data-label="Setor">${esc(e.setor)}</td>
      <td data-label="Localização">${esc(e.localizacao || "—")}</td>
      <td data-label="Condição"><span class="cond cond-${esc(cond)}">${esc(e.condicao)}</span></td>
      <td data-label="Situação"><span class="badge badge-${s.cls}">${s.rotulo}</span></td>
      <td class="col-acao"><a class="btn btn-ghost btn-sm" href="${href}">Ver detalhes</a>${e.situacao === "inativo" ? "" : ` <button class="btn btn-ghost btn-sm" type="button" data-retirar="${esc(e.id)}">Retirar de uso</button>`}</td>
    </tr>`;
  }

  function observarMais() {
    observadorCarregamento?.disconnect();
    const gatilho = $("carregar-mais");
    if (!gatilho || gatilho.hidden || !window.IntersectionObserver) return;
    observadorCarregamento = new IntersectionObserver((entradas) => {
      if (entradas.some((entrada) => entrada.isIntersecting)) {
        quantidadeVisivel += TAMANHO_PAGINA;
        render();
      }
    }, { rootMargin: "0px 0px 280px" });
    observadorCarregamento.observe(gatilho);
  }

  function render() {
    observadorCarregamento?.disconnect();
    const ordem = campos.ordem.value || "recentes";
    const crescente = !ordem.endsWith("-desc");
    const porPatrimonio = ordem.startsWith("patrimonio");
    const porRecentes = ordem === "recentes";
    const comparar = (a, b) => {
      if (porRecentes) {
        const dataA = new Date(a.updated_at || a.atualizado_em || a.created_at || a.criado_em || 0).getTime() || 0;
        const dataB = new Date(b.updated_at || b.atualizado_em || b.created_at || b.criado_em || 0).getTime() || 0;
        if (dataA !== dataB) return dataB - dataA;
      }
      const valorA = porPatrimonio ? String(a.patrimonio || "") : String(a.nome || "");
      const valorB = porPatrimonio ? String(b.patrimonio || "") : String(b.nome || "");
      const resultado = valorA.localeCompare(valorB, "pt-BR", { numeric: true, sensitivity: "base" });
      if (resultado !== 0) return crescente ? resultado : -resultado;
      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" });
    };
    const lista = filtrar().sort(comparar);
    const filtrando = lista.length !== todos.length;
    const visiveis = lista.slice(0, quantidadeVisivel);
    const restante = lista.length - visiveis.length;
    $("contagem").textContent = lista.length === 1
      ? `1 equipamento${filtrando ? ` de ${todos.length}` : ""}`
      : restante > 0
        ? `Exibindo ${visiveis.length} de ${lista.length} equipamentos${filtrando ? ` (${todos.length} no total)` : ""}`
        : `${lista.length} equipamentos${filtrando ? ` de ${todos.length}` : ""}`;

    if (!lista.length) {
      $("lista").innerHTML = `<p class="estado-vazio">${todos.length
        ? "Nenhum equipamento corresponde a esses filtros. Tente outro termo ou limpe os filtros."
        : "Nenhum equipamento cadastrado ainda. Use “Cadastrar equipamento” para começar."}</p>`;
      return;
    }

    const todosResultadosMarcados = lista.length > 0 && lista.every((e) => selecionados.has(String(e.id)));
    const algumResultadoMarcado = lista.some((e) => selecionados.has(String(e.id)));
    $("lista").innerHTML = `
      <table class="table table-eq">
        <thead><tr>
          <th scope="col" class="col-selecao"><input type="checkbox" data-selecionar-todos aria-label="Selecionar todos os equipamentos do resultado para etiquetas"${todosResultadosMarcados ? " checked" : ""}></th>
          <th scope="col">Equipamento</th><th scope="col">Patrimônio</th><th scope="col">Categoria</th>
          <th scope="col">Setor</th><th scope="col">Localização</th><th scope="col">Condição</th><th scope="col">Situação</th>
          <th scope="col"><span class="sr-only">Ações</span></th>
        </tr></thead>
        <tbody>
          ${visiveis.map(linhaEquipamento).join("")}
        </tbody>
      </table>
      <div class="lista-carregamento"${restante > 0 ? "" : " hidden"}>
        <span aria-live="polite">${restante > 0 ? `${restante} equipamento${restante === 1 ? " restante" : "s restantes"}` : "Todos os equipamentos foram exibidos."}</span>
        <button class="btn btn-line btn-sm" type="button" id="carregar-mais">Carregar mais</button>
      </div>`;
    const cabecalho = $("lista").querySelector("[data-selecionar-todos]");
    if (cabecalho) cabecalho.indeterminate = algumResultadoMarcado && !todosResultadosMarcados;
    observarMais();
  }

  try {
    todos = await ELO.equipamentos();
  } catch (err) {
    $("contagem").textContent = "";
    const erro = $("erro");
    erro.innerHTML = `${esc(err.message)} <button class="btn btn-primary btn-sm" type="button" id="tentar">Tentar de novo</button>`;
    erro.hidden = false;
    $("tentar").addEventListener("click", () => window.location.reload());
    return;
  }

  campos.situacao.insertAdjacentHTML("beforeend",
    Object.entries(SITUACOES).map(([k, v]) => `<option value="${k}">${v.rotulo}</option>`).join(""));
  opcoes(campos.categoria, unicos(todos, "categoria"));
  opcoes(campos.setor, unicos(todos, "setor"));
  opcoes(campos.condicao, unicos(todos, "condicao"));

  // Permite abrir a página já filtrada, ex.: equipamentos.html?situacao=atrasado
  const params = new URLSearchParams(window.location.search);
  const inicial = params.get("situacao");
  if (inicial && SITUACOES[inicial]) campos.situacao.value = inicial;
  const ordemInicial = params.get("ordem");
  if (ordemInicial && [...campos.ordem.options].some((option) => option.value === ordemInicial)) campos.ordem.value = ordemInicial;

  Object.values(campos).forEach((c) => c.addEventListener("input", () => {
    quantidadeVisivel = TAMANHO_PAGINA;
    render();
  }));
  $("filtros").addEventListener("submit", (e) => e.preventDefault());
  $("limpar").addEventListener("click", () => {
    Object.values(campos).forEach((c) => { c.value = ""; });
    campos.ordem.value = "recentes";
    campos.busca.focus();
    quantidadeVisivel = TAMANHO_PAGINA;
    render();
  });

  $("lista").addEventListener("click", (ev) => {
    if (!ev.target.closest("#carregar-mais")) return;
    quantidadeVisivel += TAMANHO_PAGINA;
    render();
  });

  function avisar(texto, tipo = "ok") {
    document.getElementById("aviso")?.remove();
    $("filtros").insertAdjacentHTML("beforebegin",
      `<div class="alert alert-${tipo}" id="aviso" role="status" style="margin-bottom:1.25rem">${esc(texto)}</div>`);
  }

  $("lista").addEventListener("change", (ev) => {
    const item = ev.target.closest("[data-selecionar]");
    if (item) {
      if (item.checked) selecionados.add(item.dataset.selecionar); else selecionados.delete(item.dataset.selecionar);
      atualizarEstadoSelecaoCabecalho();
      atualizarBotaoEtiquetas();
      return;
    }
    const todosResultados = ev.target.closest("[data-selecionar-todos]");
    if (todosResultados) {
      filtrar().forEach((equipamento) => {
        const id = String(equipamento.id);
        if (todosResultados.checked) selecionados.add(id); else selecionados.delete(id);
      });
      atualizarBotaoEtiquetas();
      render();
    }
  });

  // "Retirar de uso" → ELO.removerEquipamento(id) → PATCH /equipamentos/<id>/inativar
  $("lista").addEventListener("click", async (ev) => {
    const botao = ev.target.closest("[data-retirar]");
    if (!botao) return;
    const eq = todos.find((e) => String(e.id) === botao.dataset.retirar);
    if (!eq) return;
    const observacoes = window.prompt(`Informe o motivo obrigatório para retirar “${eq.nome}” de uso:`);
    if (observacoes === null) return;
    if (!observacoes.trim()) { avisar("A observação é obrigatória para retirar o equipamento de uso.", "error"); return; }
    if (!confirm(`Confirma a retirada de “${eq.nome}” de uso? O histórico será preservado.`)) return;
    botao.disabled = true;
    try {
      await ELO.removerEquipamento(eq.id, { observacoes: observacoes.trim() });
      todos = await ELO.equipamentos();
      quantidadeVisivel = TAMANHO_PAGINA;
      render();
      avisar("Equipamento retirado de uso; histórico preservado.");
    } catch (err) {
      botao.disabled = false;
      avisar(err.message || "Não foi possível retirar o equipamento de uso.", "error");
    }
  });

  // Confirmação vinda do formulário (equipamentos.html?salvo=criado|editado)
  const salvo = new URLSearchParams(window.location.search).get("salvo");
  const mensagens = {
    criado: "Equipamento cadastrado.",
    editado: "Alterações salvas.",
    arquivado: "Equipamento retirado de uso; histórico preservado.",
    removido: "Equipamento retirado de uso.",
  };
  if (mensagens[salvo]) {
    avisar(mensagens[salvo]);
    history.replaceState(null, "", window.location.pathname);
  }

  atualizarBotaoEtiquetas();
  render();
})();
