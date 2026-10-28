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

  function nomeNormalizado(valor) {
    return String(valor || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  }

  function renderInicioUsuario(equipamentos, todosEmprestimos, sessao) {
    const nome = String(sessao?.nome || "").trim();
    const primeiroNome = nome.split(/\s+/)[0] || "bem-vindo(a)";
    const h1 = document.querySelector(".page-head h1");
    const intro = document.querySelector(".page-head p");
    const botaoCadastro = document.querySelector(".page-head > .btn");
    if (h1) h1.textContent = `Olá, ${primeiroNome}`;
    if (intro) intro.textContent = "O que você precisa fazer hoje?";
    if (botaoCadastro) botaoCadastro.hidden = true;
    const indicadores = document.querySelector('section[aria-label="Indicadores"]');
    const distribuicao = document.querySelector('section[aria-labelledby="t-dist"]');
    const painelEquipe = document.querySelector(".dash-grid");
    if (indicadores) indicadores.hidden = true;
    if (distribuicao) distribuicao.hidden = true;
    if (painelEquipe) painelEquipe.hidden = true;

    const area = $("inicio-usuario");
    area.hidden = false;
    const matriculaSessao = nomeNormalizado(sessao?.matricula);
    const meus = (Array.isArray(todosEmprestimos) ? todosEmprestimos : []).filter((l) => {
      const porNome = nomeNormalizado(l.solicitante?.nome) === nomeNormalizado(nome);
      const matriculaRegistro = nomeNormalizado(l.solicitante?.matricula);
      return porNome || Boolean(matriculaSessao && matriculaRegistro && matriculaSessao === matriculaRegistro);
    });
    const ativos = meus.filter((l) => !l.devolvida).sort((a, b) => new Date(a.prevista) - new Date(b.prevista));
    const disponiveis = (Array.isArray(equipamentos) ? equipamentos : []).filter((e) => e.situacao === "disponivel");
    $("quantidade-disponivel").textContent = disponiveis.length;

    if (!ativos.length) {
      $("itens-comigo").innerHTML = '<div class="self-empty">Você não tem equipamentos emprestados no momento.<br><a href="disponiveis.html">Ver o que está disponível</a></div>';
      return;
    }
    $("itens-comigo").innerHTML = `<div class="self-loan-list">${ativos.slice(0, 5).map((l) => {
      const prazoItem = prazo(l.prevista);
      const situacao = prazoItem.classe === "late" ? `<span class="badge badge-late">${esc(prazoItem.texto)}</span>` : `<span class="badge badge-ok">Devolver até ${esc(new Date(l.prevista).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }))}</span>`;
      return `<article class="self-loan"><div class="self-loan-main"><strong>${esc(l.equipamento?.nome || "Equipamento")}</strong><small>${esc(l.equipamento?.patrimonio || "")}</small></div><div class="self-loan-meta">${situacao}</div></article>`;
    }).join("")}${ativos.length > 5 ? `<a href="emprestimos.html">Ver os ${ativos.length} itens</a>` : ""}</div>`;
  }

  try {
    const sessao = typeof obterSessao === "function" ? obterSessao() : null;
    const perfilFinal = ["aluno", "professor", "servidor"].includes(String(sessao?.perfil || "").toLowerCase());
    if (perfilFinal) {
      const [equipamentos, todosEmprestimos] = await Promise.all([ELO.equipamentos(), ELO.emprestimos()]);
      renderInicioUsuario(equipamentos, todosEmprestimos, sessao);
      return;
    }

    const [resumo, todosEmprestimos, todasMovimentacoes] = await Promise.all([
      ELO.resumoDashboard(), ELO.emprestimos(), ELO.movimentacoes(),
    ]);
    renderKpis(resumo);
    renderDistribuicao(resumo);
    renderAcompanhar(todosEmprestimos);
    renderMovimentacoes(todasMovimentacoes);
  } catch (err) {
    ["kpis", "dist", "acompanhar", "movs", "itens-comigo"].forEach((id) => { const el = $(id); if (el) el.innerHTML = ""; });
    const erro = $("erro");
    erro.textContent = `Não foi possível carregar as informações. ${err.message || "Tente novamente."}`;
    erro.hidden = false;
    const tentar = document.createElement("button");
    tentar.type = "button"; tentar.className = "btn btn-primary"; tentar.textContent = "Tentar novamente";
    tentar.addEventListener("click", () => window.location.reload());
    erro.appendChild(tentar);
  }
})();