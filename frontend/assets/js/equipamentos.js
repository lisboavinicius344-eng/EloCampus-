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
  };

  let todos = [];

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

  function render() {
    const lista = filtrar().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    const filtrando = lista.length !== todos.length;
    $("contagem").textContent = lista.length === 1
      ? `1 equipamento${filtrando ? ` de ${todos.length}` : ""}`
      : `${lista.length} equipamentos${filtrando ? ` de ${todos.length}` : ""}`;

    if (!lista.length) {
      $("lista").innerHTML = `<p class="estado-vazio">${todos.length
        ? "Nenhum equipamento corresponde a esses filtros. Tente outro termo ou limpe os filtros."
        : "Nenhum equipamento cadastrado ainda. Use “Cadastrar equipamento” para começar."}</p>`;
      return;
    }

    $("lista").innerHTML = `
      <table class="table table-eq">
        <thead><tr>
          <th scope="col">Equipamento</th><th scope="col">Patrimônio</th><th scope="col">Tipo</th>
          <th scope="col">Setor</th><th scope="col">Condição</th><th scope="col">Situação</th>
          <th scope="col"><span class="sr-only">Ações</span></th>
        </tr></thead>
        <tbody>
          ${lista.map((e) => {
            const s = SITUACOES[e.situacao] || { rotulo: e.situacao, cls: "off" };
            const cond = norm(e.condicao);
            const visual = ELO_VISUAIS.categoria(e.categoria);
            const href = `equipamento-detalhe.html?id=${encodeURIComponent(e.id)}`;
            return `<tr>
              <td class="cell-nome"><span class="eq-mini eq-cond-${esc(cond)}" title="${esc(visual[1])}">${visual[0]}</span><a class="link-item" href="${href}">${esc(e.nome)}</a></td>
              <td data-label="Patrimônio">${esc(e.patrimonio)}</td>
              <td data-label="Tipo">${esc(e.categoria)}</td>
              <td data-label="Setor">${esc(e.setor)}</td>
              <td data-label="Condição"><span class="cond cond-${esc(cond)}">${esc(e.condicao)}</span></td>
              <td data-label="Situação"><span class="badge badge-${s.cls}">${s.rotulo}</span></td>
              <td class="col-acao"><a class="btn btn-ghost btn-sm" href="${href}">Ver detalhes</a></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
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
  const inicial = new URLSearchParams(window.location.search).get("situacao");
  if (inicial && SITUACOES[inicial]) campos.situacao.value = inicial;

  Object.values(campos).forEach((c) => c.addEventListener("input", render));
  $("filtros").addEventListener("submit", (e) => e.preventDefault());
  $("limpar").addEventListener("click", () => {
    Object.values(campos).forEach((c) => { c.value = ""; });
    campos.busca.focus();
    render();
  });

  // Confirmação vinda do formulário (equipamentos.html?salvo=criado|editado)
  const salvo = new URLSearchParams(window.location.search).get("salvo");
  if (salvo === "criado" || salvo === "editado" || salvo === "removido") {
    $("filtros").insertAdjacentHTML("beforebegin",
      `<div class="alert alert-ok" role="status" style="margin-bottom:1.25rem">${salvo === "criado" ? "Equipamento salvo." : salvo === "editado" ? "Alterações salvas." : "Equipamento retirado com segurança."}</div>`);
    history.replaceState(null, "", window.location.pathname);
  }

  render();
})();