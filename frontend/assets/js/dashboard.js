/* ELO Campus — dashboard
 * Os números vêm do objeto ELO (api.js); esta tela não calcula regras de negócio
 * além de ordenar e formatar o que recebe. */

(async function () {
  const $ = (id) => document.getElementById(id);
  const { esc, data, dataHora, prazo } = EloUtil;

  const SITUACOES = [
    { chave: "disponiveis", rotulo: "Disponível",    cls: "ok",    cor: "#39d98a" },
    { chave: "emprestados", rotulo: "Emprestado",    cls: "loan",  cor: "#4da3ff" },
    { chave: "atrasados",   rotulo: "Atrasado",      cls: "late",  cor: "#ff5d73" },
    { chave: "manutencao",  rotulo: "Em manutenção", cls: "maint", cor: "#ffb84d" },
    { chave: "inativos",    rotulo: "Inativo",       cls: "off",   cor: "#8b93a7" },
  ];

  function renderKpis(r) {
    const pct = (n) => (r.total ? Math.round((n / r.total) * 100) : 0);
    const itens = [
      { rot: "Total de equipamentos", v: r.total, nota: "Itens cadastrados", cor: "var(--purple)" },
      { rot: "Disponíveis", v: r.disponiveis, nota: `${pct(r.disponiveis)}% do acervo, prontos para empréstimo`, cor: "var(--purple)" },
      { rot: "Emprestados", v: r.emprestados, nota: "Em circulação", cor: "#4da3ff" },
      { rot: "Em atraso", v: r.atrasados, cor: "#ff5d73", alerta: r.atrasados > 0,
        nota: r.atrasados > 0 ? "Prazo vencido e ainda não devolvidos" : "Nenhum prazo vencido" },
    ];
    $("kpis").innerHTML = itens.map((k) => `
      <article class="kpi${k.alerta ? " kpi-alerta" : ""}" style="--c:${k.cor}">
        <h3>${k.rot}</h3>
        <p class="kpi-valor">${k.v}</p>
        <p class="kpi-nota">${k.nota}</p>
      </article>`).join("");
  }

  function renderAlertaAtrasos(r) {
    const area = $("alerta-atrasos");
    if (!area) return;
    const total = Number(r?.atrasados || 0);
    area.hidden = total === 0;
    if (!total) { area.innerHTML = ""; return; }
    area.innerHTML = `<strong>Atenção: ${total} empréstimo${total === 1 ? " está" : "s estão"} em atraso.</strong><span>Revise os itens vencidos e registre as devoluções pendentes.</span><a class="btn btn-danger btn-sm" href="emprestimos.html?filtro=atrasados">Ver empréstimos atrasados</a>`;
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
      .sort((a, b) => Number(EloUtil.vencido(b.prevista)) - Number(EloUtil.vencido(a.prevista)) || new Date(a.prevista) - new Date(b.prevista))
      .slice(0, 6);

    if (!ativos.length) {
      $("acompanhar").innerHTML = '<p class="estado-vazio">Nenhum empréstimo ativo no momento. Quando uma retirada for registrada, ela aparece aqui.</p>';
      return;
    }

    const area = $("acompanhar");
    area.innerHTML = `
      <table class="table">
        <thead><tr><th scope="col">Equipamento</th><th scope="col">Quem retirou</th><th scope="col">Devolução</th><th scope="col">Situação</th><th scope="col">Ações</th></tr></thead>
        <tbody>
          ${ativos.map((l) => {
            const p = prazo(l.prevista);
            return `<tr>
              <td class="cell-main"><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}</small></td>
              <td>${esc(l.solicitante.nome)}</td>
              <td>${dataHora(l.prevista)}</td>
              <td><span class="badge badge-${p.classe}">${p.texto}</span></td>
              <td class="table-actions"><button class="btn btn-sm" type="button" data-dashboard-devolver="${esc(l.chave)}">Devolver</button><button class="btn btn-sm btn-line" type="button" data-dashboard-cobrar="${esc(l.chave)}">Cobrar</button><a class="btn btn-sm btn-ghost" href="emprestimos.html?itemId=${encodeURIComponent(l.id)}&amp;emprestimoId=${encodeURIComponent(l.emprestimoId || "")}">Ver</a></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>`;
    area.onclick = async (event) => {
      const chave = event.target.closest("[data-dashboard-cobrar], [data-dashboard-devolver]")?.dataset;
      if (!chave) return;
      const item = ativos.find((l) => l.chave === (chave.dashboardCobrar || chave.dashboardDevolver));
      if (!item) return;
      if (chave.dashboardDevolver) {
        location.href = `devolucoes.html?itemId=${encodeURIComponent(item.id)}&emprestimoId=${encodeURIComponent(item.emprestimoId || "")}`;
        return;
      }
      if (!window.confirm(`Enviar cobrança por e-mail para ${item.solicitante.nome}?`)) return;
      const botao = event.target.closest("[data-dashboard-cobrar]");
      botao.disabled = true;
      try {
        const resposta = await ELO.cobrarEmprestimo(item.emprestimoId);
        const erro = $("erro");
        if (erro) { erro.textContent = resposta?.mensagem || `Cobrança enviada para ${item.solicitante.nome}.`; erro.className = "alert alert-ok dashboard-api-alert"; erro.hidden = false; }
      } catch (error) {
        const erro = $("erro");
        if (erro) { erro.textContent = error.message || "Não foi possível enviar a cobrança."; erro.className = "alert alert-error dashboard-api-alert"; erro.hidden = false; }
      } finally { botao.disabled = false; }
    };
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
          <strong>${esc(EloUtil.tipoMovimentacao(m.tipo))}</strong>
          <span>${esc(m.equipamento.nome)}${m.equipamento.patrimonio ? ` · ${esc(m.equipamento.patrimonio)}` : ""}</span>
          <small>${m.detalhe ? esc(m.detalhe) + " · " : ""}${dataHora(m.quando)} · por ${esc(m.por)}</small>
        </div>
      </li>`).join("")}</ul>`;
  }

  function renderReservasAprovadas(reservas, equipamentos = []) {
    const area = $("reservas-aprovadas");
    if (!area) return;
    const mapaEquipamentos = new Map((Array.isArray(equipamentos) ? equipamentos : []).map((item) => [String(item.id), item]));
    const aprovadas = (Array.isArray(reservas) ? reservas : [])
      .filter((reserva) => String(reserva?.status || "").toLowerCase() === "aprovada")
      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
    area.hidden = !aprovadas.length;
    area.innerHTML = aprovadas.map((reserva) => {
      const itens = (Array.isArray(reserva.itens) ? reserva.itens : Array.isArray(reserva.equipamentos) ? reserva.equipamentos : [])
        .map((item) => {
          const equipamento = item?.equipamento && typeof item.equipamento === "object" ? item.equipamento
            : mapaEquipamentos.get(String(item?.equipamento_id ?? item?.id ?? item?.equipamento ?? ""));
          return equipamento?.nome || (typeof item?.equipamento === "string" ? item.equipamento : "") || equipamento?.patrimonio;
        }).filter(Boolean);
      const inicio = new Date(reserva.data_inicio);
      inicio.setTime(inicio.getTime() - 2 * 60 * 60 * 1000);
      const fim = new Date(reserva.data_fim);
      const formatar = (valor) => Number.isNaN(valor.getTime()) ? "horário a confirmar" : valor.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const nomes = itens.length ? itens.join(", ") : "Equipamento reservado";
      return `<article class="reserva-aprovada"><div class="reserva-aprovada-icon" aria-hidden="true">✓</div><div class="reserva-aprovada-content"><strong>Sua reserva foi aprovada!</strong><p>${esc(nomes)}</p><p>Retire com a equipe de <strong>${esc(formatar(inicio))}</strong> até <strong>${esc(formatar(fim))}</strong>.</p><a href="reservas.html">Ver minha reserva</a></div></article>`;
    }).join("");
  }

  function renderInicioUsuario(equipamentos, todosEmprestimos, sessao) {
    const nome = String(sessao?.nome || "").trim();
    const primeiroNome = nome.split(/\s+/)[0] || "bem-vindo(a)";
    const h1 = document.querySelector(".page-head h1");
    const intro = document.querySelector(".page-head p");
    const botaoCadastro = document.querySelector(".page-head > .btn");
    if (h1) h1.textContent = `Olá, ${primeiroNome}`;
    if (intro) intro.textContent = "O que você precisa fazer hoje?";
    document.querySelectorAll(".equipe-action").forEach((botao) => { botao.hidden = true; });
    const indicadores = document.querySelector('section[aria-label="Indicadores"]');
    const distribuicao = document.querySelector('section[aria-labelledby="t-dist"]');
    const painelEquipe = document.querySelector(".dash-grid");
    if (indicadores) indicadores.hidden = true;
    if (distribuicao) distribuicao.hidden = true;
    if (painelEquipe) painelEquipe.hidden = true;

    const area = $("inicio-usuario");
    area.hidden = false;
    const meus = (Array.isArray(todosEmprestimos) ? todosEmprestimos : []).filter((l) => EloUtil.pertenceAoUsuario(l, sessao));
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
      const [equipamentos, todosEmprestimos, reservas] = await Promise.all([
        ELO.equipamentos(), ELO.emprestimos(), ELO.reservas().catch(() => []),
      ]);
      renderInicioUsuario(equipamentos, todosEmprestimos, sessao);
      renderReservasAprovadas(reservas, equipamentos);
      return;
    }

    const [resumo, todosEmprestimos, todasMovimentacoes] = await Promise.all([
      // O histórico pode ser restrito por perfil; sem ele o painel continua funcionando.
      ELO.resumoDashboard(), ELO.emprestimos(), ELO.movimentacoes().catch(() => []),
    ]);
    renderKpis(resumo);
    renderAlertaAtrasos(resumo);
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
