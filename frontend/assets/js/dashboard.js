/* ELO Campus — dashboard
 * Os números vêm do objeto ELO (api.js); esta tela não calcula regras de negócio
 * além de ordenar e formatar o que recebe. */

(async function () {
  const $ = (id) => document.getElementById(id);
  const { esc, data, dataHora, prazo } = EloUtil;

  const SITUACOES = [
    { chave: "disponiveis", rotulo: "Disponível",    cls: "ok",    cor: "var(--st-ok)" },
    { chave: "emprestados", rotulo: "Emprestado",    cls: "loan",  cor: "var(--st-loan)" },
    { chave: "atrasados",   rotulo: "Atrasado",      cls: "late",  cor: "var(--st-late)" },
    { chave: "manutencao",  rotulo: "Em manutenção", cls: "maint", cor: "var(--st-maint)" },
    { chave: "inativos",    rotulo: "Inativo",       cls: "off",   cor: "var(--st-off)" },
  ];

  function renderKpis(r) {
    const pct = (n) => (r.total ? Math.round((n / r.total) * 100) : 0);
    const itens = [
      { rot: "Total de equipamentos", v: r.total, nota: "Itens cadastrados", cor: "var(--purple)" },
      { rot: "Disponíveis", v: r.disponiveis, nota: `${pct(r.disponiveis)}% do acervo, prontos para empréstimo`, cor: "var(--st-ok)" },
      { rot: "Emprestados", v: r.emprestados, nota: "Em circulação, dentro do prazo", cor: "var(--st-loan)" },
      { rot: "Em atraso", v: r.atrasados, cor: "var(--st-late)", alerta: r.atrasados > 0,
        nota: r.atrasados > 0 ? "Prazo vencido e ainda não devolvidos" : "Nenhum prazo vencido" },
    ];
    $("kpis").innerHTML = itens.map((k) => `
      <article class="kpi${k.alerta ? " kpi-alerta" : ""}" style="--c:${k.cor}">
        <h3>${k.rot}</h3>
        <p class="kpi-valor">${k.v}</p>
        <p class="kpi-nota">${k.nota}</p>
      </article>`).join("");
  }

  function renderDistribuicao(r) {
    const partes = SITUACOES.filter((s) => r[s.chave] > 0);
    const resumo = SITUACOES.map((s) => `${r[s.chave]} ${s.rotulo.toLowerCase()}`).join(", ");
    $("dist").innerHTML = `
      <div class="dist-barra" role="img" aria-label="Distribuição: ${resumo}">
        ${partes.map((s) => `<span style="--c:${s.cor};flex:${r[s.chave]}"></span>`).join("")}
      </div>
      <ul class="dist-legenda">
        ${SITUACOES.map((s) => `<li class="badge badge-${s.cls}">${s.rotulo}: ${r[s.chave]}</li>`).join("")}
      </ul>`;
  }

  function renderAcompanhar(lista) {
    const ativos = (Array.isArray(lista) ? lista : [])
      .filter((l) => l && l.equipamento && l.solicitante && !l.devolvida)
      .sort((a, b) => new Date(a.prevista) - new Date(b.prevista))
      .slice(0, 6);

    if (!ativos.length) {
      $("acompanhar").innerHTML = '<p class="estado-vazio">Nenhum empréstimo ativo no momento. Quando uma retirada for registrada, ela aparece aqui.</p>';
      return;
    }

    $("acompanhar").innerHTML = `
      <table class="table">
        <thead><tr><th scope="col">Equipamento</th><th scope="col">Quem retirou</th><th scope="col">Devolução</th><th scope="col">Situação</th></tr></thead>
        <tbody>
          ${ativos.map((l) => {
            const p = prazo(l.prevista);
            return `<tr>
              <td class="cell-main"><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}</small></td>
              <td>${esc(l.solicitante.nome)}</td>
              <td>${dataHora(l.prevista)}</td>
              <td><span class="badge badge-${p.classe}">${p.texto}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
  }

  function renderMovimentacoes(lista) {
    const recentes = (Array.isArray(lista) ? lista : []).filter((m) => m && m.equipamento).slice(0, 6);
    if (!recentes.length) {
      $("movs").innerHTML = '<p class="estado-vazio">Ainda não há movimentações registradas.</p>';
      return;
    }
    $("movs").innerHTML = `<ul class="movs">${recentes.map((m) => `
      <li class="mov mov-${esc(m.classe)}">
        <span class="mov-ponto" aria-hidden="true"></span>
        <div>
          <strong>${esc(m.tipo)}</strong>
          <span>${esc(m.equipamento.nome)} · ${esc(m.equipamento.patrimonio)}</span>
          <small>${m.detalhe ? esc(m.detalhe) + " · " : ""}${dataHora(m.quando)} · por ${esc(m.por)}</small>
        </div>
      </li>`).join("")}</ul>`;
  }

  try {
    const [resumo, todosEmprestimos, todasMovimentacoes] = await Promise.all([
      ELO.resumoDashboard(),
      ELO.emprestimos(),
      ELO.movimentacoes(),
    ]);
    const sessao = typeof obterSessao === "function" ? obterSessao() : null;
    const perfilFinal = ["aluno", "professor"].includes(String(sessao?.perfil || "").toLowerCase());
    const chaveNome = (s) => String(s || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const emprestimos = perfilFinal ? todosEmprestimos.filter((l) => chaveNome(l.solicitante?.nome) === chaveNome(sessao.nome)) : todosEmprestimos;
    const movimentacoes = perfilFinal ? todasMovimentacoes.filter((m) => chaveNome(m.detalhe).includes(chaveNome(sessao.nome))) : todasMovimentacoes;
    renderKpis(resumo);
    renderDistribuicao(resumo);
    renderAcompanhar(emprestimos);
    renderMovimentacoes(movimentacoes);
    if (perfilFinal) {
      const titulo = $("t-acomp"); if (titulo) titulo.textContent = "Meus empréstimos";
      const tituloMov = $("t-movs"); if (tituloMov) tituloMov.textContent = "Minhas movimentações";
    }
  } catch (err) {
    ["kpis", "dist", "acompanhar", "movs"].forEach((id) => { const el = $(id); if (el) el.innerHTML = ""; });
    const erro = $("erro");
    erro.innerHTML = `${esc(err.message)} <button class="btn btn-primary" type="button" id="tentar">Tentar de novo</button>`;
    erro.hidden = false;
    $("tentar").addEventListener("click", () => window.location.reload());
  }
})();