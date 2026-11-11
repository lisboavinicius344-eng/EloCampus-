/* Interações das páginas Empréstimos e Devoluções. As operações são persistidas pela API oficial via ELO. */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (value) => EloUtil.esc(value ?? "");
  const dataHora = (value) => value ? EloUtil.dataHora(value) : "—";
  const mesmoDia = (a, b) => {
    const x = new Date(a), y = new Date(b);
    return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate();
  };
  const norm = (s) => String(s ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const statusEmprestimo = (l) => {
    if (l.devolvida) return { texto: "Devolvido", classe: "pill-ok" };
    const prazo = EloUtil.prazo(l.prevista);
    return { texto: prazo.texto, classe: prazo.classe === "late" ? "pill-late" : prazo.classe === "maint" ? "pill-warn" : "pill-ok" };
  };
  const aviso = (el, texto, tipo = "info") => {
    if (!el) return;
    el.hidden = false;
    el.className = `alert alert-${tipo}`;
    el.textContent = texto;
  };

  async function paginaEmprestimos() {
    const corpo = $("lista-emprestimos");
    if (!corpo) return;
    const busca = $("busca");
    const abas = [...document.querySelectorAll("[data-filtro]")];
    const sessao = typeof obterSessao === "function" ? obterSessao() : null;
    const usuarioFinal = ["aluno", "professor", "servidor"].includes(String(sessao?.perfil || "").toLowerCase());
    const pertenceAoUsuario = (l) => !usuarioFinal || EloUtil.pertenceAoUsuario(l, sessao);
    if (usuarioFinal) {
      const titulo = document.querySelector(".page-head h1");
      const descricao = document.querySelector(".page-head p");
      if (titulo) titulo.textContent = "Meus empréstimos";
      if (descricao) descricao.textContent = "A devolução é registrada pela equipe do acervo. Entregue o equipamento presencialmente para conferência e registro.";
      if (busca) busca.placeholder = "Buscar meus equipamentos";
      const acao = document.querySelector('.page-head a[href="novo-emprestimo.html"]');
      if (acao) acao.textContent = "Reservar";
      const cabecalhos = document.querySelectorAll(".table-wrap thead th");
      if (cabecalhos[1]) cabecalhos[1].hidden = true;
      if (cabecalhos[2]) cabecalhos[2].textContent = "Prazo / devolução";
      const detalhes = document.querySelector('aside.card[aria-label="Detalhe do empréstimo"]');
      if (detalhes) detalhes.hidden = true;
      const rotulosUsuario = { ativos: "Comigo", atrasados: "Atrasados", historico: "Devolvidos" };
      abas.forEach((aba) => { if (rotulosUsuario[aba.dataset.filtro]) aba.dataset.rotuloUsuario = rotulosUsuario[aba.dataset.filtro]; });
    }
    let registros = [], filtro = "ativos", selecionado = null;

    const grupoDa = (l) => registros.filter((x) => String(x.emprestimoId) === String(l.emprestimoId));
    function filtrar() {
      const termo = norm(busca?.value.trim());
      return registros.filter((l) => {
        const ativo = !l.devolvida;
        const atrasado = ativo && EloUtil.vencido(l.prevista);
        const statusOK = filtro === "ativos" ? ativo : filtro === "atrasados" ? atrasado : !ativo;
        const texto = [l.equipamento?.nome, l.equipamento?.patrimonio, l.solicitante?.nome, l.registradoPor, l.finalidade].join(" ");
        return statusOK && (!termo || norm(texto).includes(termo));
      });
    }
    function desenharDetalhe(l) {
      selecionado = l;
      corpo.querySelectorAll("tr[data-item-id]").forEach((row) => {
        const ativo = Boolean(l && row.dataset.itemId === l.chave);
        row.classList.toggle("is-selected", ativo);
        row.setAttribute("aria-selected", String(ativo));
      });
      $("detalhe-nome").textContent = l ? l.equipamento.nome : "Selecione um empréstimo";
      $("detalhe-sub").textContent = l ? `${l.equipamento.patrimonio} · ${l.solicitante.nome}` : "Os detalhes aparecerão aqui.";
      const estado = l ? statusEmprestimo(l) : { texto: "—", classe: "pill-ok" };
      const pill = $("detalhe-status"); pill.textContent = estado.texto; pill.className = `pill ${estado.classe}`;
      const timeline = $("detalhe-timeline");
      if (!l) {
        timeline.innerHTML = '<li><div class="muted">Selecione um empréstimo para ver as datas e movimentações.</div></li>';
        $("detalhe-devolver").href = "devolucoes.html";
        $("detalhe-devolver").setAttribute("aria-disabled", "true");
        return;
      }
      const eventos = [
        ["dot-purple", "Retirada registrada", `${dataHora(l.retirada)} · por ${esc(l.registradoPor)}`],
        ["dot-cyan", "Devolução prevista", dataHora(l.prevista)],
      ];
      if (l.devolvida) eventos.push(["dot-pink", "Devolução registrada", `${dataHora(l.devolvida)} · por ${esc(l.responsavelDevolucao || l.registradoPor)}${l.condicaoDevolucao ? ` · ${esc(l.condicaoDevolucao)}` : ""}`]);
      if (l.observacoes) eventos.push(["dot-cyan", "Observação do empréstimo", esc(l.observacoes)]);
      if (l.observacoesDevolucao) eventos.push(["dot-pink", "Observação da devolução", esc(l.observacoesDevolucao)]);
      timeline.innerHTML = eventos.map(([dot, titulo, detalhe]) => `<li><span class="dot ${dot}"></span><div><strong>${titulo}</strong><div class="muted">${detalhe}</div></div></li>`).join("");
      const link = $("detalhe-devolver");
      if (usuarioFinal) {
        link.removeAttribute("href");
        link.textContent = l.devolvida ? "Devolução registrada" : "Entregue à equipe do acervo";
        link.setAttribute("aria-disabled", "true");
        link.classList.add("is-disabled");
      } else {
        link.href = l.devolvida ? "devolucoes.html" : `devolucoes.html?itemId=${encodeURIComponent(l.id)}&emprestimoId=${encodeURIComponent(l.emprestimoId)}`;
        link.setAttribute("aria-disabled", String(Boolean(l.devolvida)));
        link.classList.toggle("is-disabled", Boolean(l.devolvida));
      }
    }
    function renderizar() {
      const filtrados = filtrar();
      abas.forEach((aba) => {
        const chave = aba.dataset.filtro;
        const total = registros.filter((l) => chave === "ativos" ? !l.devolvida : chave === "atrasados" ? (!l.devolvida && EloUtil.vencido(l.prevista)) : Boolean(l.devolvida)).length;
        const rotulos = usuarioFinal ? { ativos: "Comigo", atrasados: "Atrasados", historico: "Devolvidos" } : { ativos: "Ativos", atrasados: "Atrasados", historico: "Histórico" };
        aba.textContent = `${rotulos[chave] || aba.textContent} · ${total}`;
        aba.setAttribute("aria-selected", String(chave === filtro));
      });
      if (!filtrados.length) {
        corpo.innerHTML = `<tr><td colspan="5" class="muted">${registros.length ? "Nenhum item corresponde a este filtro." : usuarioFinal ? 'Você ainda não tem empréstimos. <a href="disponiveis.html">Ver o que pode solicitar</a>.' : "Não há empréstimos registrados no sistema."}</td></tr>`;
        desenharDetalhe(null);
        return;
      }
      corpo.innerHTML = filtrados.map((l) => {
        const status = statusEmprestimo(l);
        if (usuarioFinal) {
          return `<tr data-item-id="${esc(l.chave)}"${status.classe === "pill-late" ? ' class="is-late"' : ""}>
            <td><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}</small></td>
            <td hidden></td>
            <td>${dataHora(l.devolvida || l.prevista)}</td>
            <td><span class="pill ${status.classe}">${esc(status.texto)}</span></td>
            <td>${l.devolvida ? '<span class="muted small">Devolvido</span>' : '<span class="muted small">Entregue à equipe do acervo</span>'}</td>
          </tr>`;
        }
        return `<tr data-item-id="${esc(l.chave)}"${status.classe === "pill-late" ? ' class="is-late"' : ""}>
          <td><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}${grupoDa(l).length > 1 ? ` · ${grupoDa(l).length} itens no empréstimo` : ""}</small></td>
          <td>${esc(l.solicitante.nome)}<small>por ${esc(l.registradoPor || "—")}</small></td>
          <td>${dataHora(l.devolvida || l.prevista)}</td>
          <td><span class="pill ${status.classe}">${esc(status.texto)}</span></td>
          <td>${l.devolvida ? '<span class="muted small">Concluído</span>' : `<button class="btn btn-sm" type="button" data-devolver="${esc(l.chave)}">Devolver</button>`}</td>
        </tr>`;
      }).join("");
      const activeSelection = filtrados.find((l) => l.chave === selecionado?.chave) || filtrados[0];
      desenharDetalhe(activeSelection);
    }

    abas.forEach((aba) => aba.addEventListener("click", () => { filtro = aba.dataset.filtro; renderizar(); }));
    busca?.addEventListener("input", renderizar);
    corpo.addEventListener("click", (event) => {
      const devolver = event.target.closest("[data-devolver]");
      const row = event.target.closest("tr[data-item-id]");
      if (devolver) {
        const l = registros.find((x) => x.chave === devolver.dataset.devolver);
        if (l && !l.devolvida) location.href = `devolucoes.html?itemId=${encodeURIComponent(l.id)}&emprestimoId=${encodeURIComponent(l.emprestimoId)}`;
        return;
      }
      if (row) {
        const l = registros.find((x) => x.chave === row.dataset.itemId);
        if (l) desenharDetalhe(l);
      }
    });
    try {
      const carregados = await ELO.emprestimos();
      registros = carregados.filter(pertenceAoUsuario);
      if (usuarioFinal) {
        const titulo = document.querySelector(".page-head h1");
        const descricao = document.querySelector(".page-head p");
        if (titulo) titulo.textContent = "Meus empréstimos";
        if (descricao) descricao.textContent = "A devolução é registrada pela equipe do acervo. Entregue o equipamento presencialmente para conferência e registro.";
      }
      renderizar();
      const salvo = new URLSearchParams(location.search).get("salvo");
      if (salvo === "registrado") {
        const msg = document.createElement("div");
        msg.className = "alert alert-ok"; msg.setAttribute("role", "status");
        msg.textContent = "Empréstimo registrado no sistema oficial.";
        document.querySelector(".page-head")?.after(msg);
        history.replaceState(null, "", location.pathname);
      }
    } catch (error) {
      corpo.innerHTML = `<tr><td colspan="5" class="muted">${esc(error.message)}</td></tr>`;
    }
  }

  async function paginaDevolucoes() {
    const form = $("form-devolucao");
    if (!form) return;
    const sessaoInicial = typeof obterSessao === "function" ? obterSessao() : null;
    const perfilInicial = String(sessaoInicial?.perfil || "").toLowerCase();
    if (["aluno", "professor"].includes(perfilInicial)) { window.location.replace("dashboard.html"); return; }
    const query = new URLSearchParams(location.search);
    const itemInicial = query.get("itemId");
    const emprestimoInicial = query.get("emprestimoId");
    const busca = $("busca");
    const abas = [...document.querySelectorAll("[data-periodo]")];
    const corpoRecentes = $("lista-devolucoes-recentes");
    const fila = $("fila-devolucao");
    const listaAtivos = $("lista-emprestimos-ativos");
    const inputPatrimonio = $("patrimonio");
    const itensContainer = $("itens-devolucao");
    const mensagem = $("mensagem-devolucao");
    const sessao = typeof obterSessao === "function" ? obterSessao() : null;
    const perfil = String(sessao?.perfil || "").toLowerCase();
    const usuarioFinal = ["aluno", "professor", "servidor"].includes(perfil);
    const pertenceAoUsuario = (l) => !usuarioFinal || EloUtil.pertenceAoUsuario(l, sessao);
    let registros = [], periodo = "hoje", itensDoGrupo = [], revisar = false;

    if (usuarioFinal) {
      const titulo = document.querySelector(".page-head h1");
      const descricao = document.querySelector(".page-head p");
      if (titulo) titulo.textContent = "Devolver equipamentos";
      if (descricao) descricao.textContent = "Marque os itens que está entregando e confira antes de confirmar.";
      const tituloFormulario = form.querySelector("h2");
      if (tituloFormulario) tituloFormulario.textContent = "O que você vai devolver?";
      const campoPatrimonio = inputPatrimonio.closest(".field");
      if (campoPatrimonio) campoPatrimonio.hidden = true;
      const labelAssinatura = form.querySelector("#assinatura-recebida")?.closest("label");
      if (labelAssinatura) labelAssinatura.querySelector("span")?.replaceChildren(document.createTextNode("Responsável confirmou o recebimento / conferência"));
      const tituloCondicao = $("cond-label");
      if (tituloCondicao) tituloCondicao.textContent = "Como está o equipamento?";
      const labelsCondicao = { c1: "Tudo certo", c2: "Falta algum acessório", c3: "Há algum problema" };
      Object.entries(labelsCondicao).forEach(([id, texto]) => { const label = document.querySelector(`label[for="${id}"]`); if (label) label.textContent = texto; });
      const checklist = form.querySelector(".checklist"); if (checklist) checklist.hidden = false;
      const labelObs = $("obs")?.closest(".field")?.querySelector("label");
      if (labelObs) labelObs.textContent = "Observação (opcional) — informe se falta algo ou se há algum problema";
      const cancel = form.querySelector('a[href="emprestimos.html"]');
      if (cancel) { cancel.href = "dashboard.html"; cancel.textContent = "Voltar ao início"; }
      document.querySelector(".stats")?.setAttribute("hidden", "");
      document.querySelector('.split > .grow-2.stack')?.setAttribute("hidden", "");
      document.querySelector('.card[aria-label="Devoluções recentes"]')?.setAttribute("hidden", "");
      document.querySelector('.card[aria-label="Aguardando devolução hoje"]')?.setAttribute("hidden", "");
      document.querySelector(".page-head .toolbar")?.setAttribute("hidden", "");
      const textoVazio = itensContainer.querySelector(".muted");
      if (textoVazio) textoVazio.textContent = "Seus equipamentos emprestados aparecerão aqui para você escolher o que vai devolver.";
    }

    function noPeriodo(data) {
      const dt = new Date(data); const hoje = new Date();
      hoje.setHours(0,0,0,0);
      if (periodo === "hoje") return mesmoDia(dt, new Date());
      if (periodo === "semana") {
        const inicio = new Date(hoje); const diaSemana = (inicio.getDay() + 6) % 7; inicio.setDate(inicio.getDate() - diaSemana);
        return dt >= inicio && dt <= new Date();
      }
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return dt >= inicio && dt <= new Date();
    }
    function desenharRecentes() {
      const termo = norm(busca?.value.trim());
      const devolvidos = registros.filter((l) => l.devolvida && noPeriodo(l.devolvida) && (!termo || norm([l.equipamento.nome, l.equipamento.patrimonio, l.solicitante.nome, l.responsavelDevolucao, l.condicaoDevolucao].join(" ")).includes(termo)))
        .sort((a,b) => new Date(b.devolvida) - new Date(a.devolvida));
      abas.forEach((a) => a.setAttribute("aria-selected", String(a.dataset.periodo === periodo)));
      corpoRecentes.innerHTML = devolvidos.length ? devolvidos.map((l) => {
        const cond = l.condicaoDevolucao || "Não informada";
        const pill = cond === "Danificado" ? "pill-late" : cond === "Regular" ? "pill-warn" : "pill-ok";
        const pessoa = usuarioFinal
          ? `<td>${esc(l.solicitante.nome)}<small>registrado no seu perfil</small></td>`
          : `<td>${esc(l.solicitante.nome)}<small>recebido por ${esc(l.responsavelDevolucao || "—")}</small></td>`;
        return `<tr><td><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}</small></td>${pessoa}<td>${dataHora(l.devolvida)}</td><td><span class="pill ${pill}">${esc(cond)}</span></td></tr>`;
      }).join("") : `<tr><td colspan="4" class="muted">${registros.some((l) => l.devolvida) ? "Nenhuma devolução corresponde ao período ou à pesquisa." : "Nenhuma devolução registrada no sistema."}</td></tr>`;
    }
    function desenharAtivos() {
      if (!listaAtivos) return;
      const termo = norm(busca?.value.trim());
      const ativos = registros.filter((l) => !l.devolvida && (!termo || norm([l.equipamento.nome, l.equipamento.patrimonio, l.solicitante.nome, l.solicitante.matricula].join(" ")).includes(termo)))
        .sort((a, b) => {
          const grupoA = mesmoDia(a.prevista, new Date()) ? 0 : EloUtil.vencido(a.prevista) ? 1 : 2;
          const grupoB = mesmoDia(b.prevista, new Date()) ? 0 : EloUtil.vencido(b.prevista) ? 1 : 2;
          return grupoA - grupoB || new Date(a.prevista) - new Date(b.prevista);
        });
      if (!ativos.length) {
        listaAtivos.innerHTML = '<p class="muted">Nenhum empréstimo em andamento corresponde à pesquisa.</p>';
        return;
      }
      listaAtivos.innerHTML = `<div class="active-loans-table-wrap"><table class="active-loans-table"><thead><tr><th>Equipamento</th><th>Patrimônio</th><th>Solicitante</th><th>Empréstimo</th><th>Devolução prevista</th><th>Situação</th><th>Ação</th></tr></thead><tbody>${ativos.map((l) => {
        const hoje = mesmoDia(l.prevista, new Date());
        const prazo = EloUtil.prazo(l.prevista);
        const situacao = hoje ? { texto: "Aguardando hoje", classe: "pill-warn" } : prazo.classe === "late" ? { texto: prazo.texto, classe: "pill-late" } : { texto: "Em andamento", classe: "pill-ok" };
        return `<tr class="${hoje ? "is-due-today" : prazo.classe === "late" ? "is-overdue" : ""}"><td data-label="Equipamento"><strong>${esc(l.equipamento.nome)}</strong></td><td data-label="Patrimônio">${esc(l.equipamento.patrimonio || "—")}</td><td data-label="Solicitante"><strong>${esc(l.solicitante.nome)}</strong><small>${esc(l.solicitante.matricula || l.solicitante.vinculo || "")}</small></td><td data-label="Empréstimo">${dataHora(l.retirada)}</td><td data-label="Devolução prevista">${dataHora(l.prevista)}</td><td data-label="Situação"><span class="pill ${situacao.classe}">${esc(situacao.texto)}</span></td><td data-label="Ação"><button class="btn btn-sm active-return-btn" type="button" data-receber="${esc(l.chave)}">Registrar devolução</button></td></tr>`;
      }).join("")}</tbody></table></div>`;
    }
    function desenharFila() {
      const hoje = new Date();
      const aguardando = registros.filter((l) => !l.devolvida && mesmoDia(l.prevista, hoje)).sort((a,b) => new Date(a.prevista) - new Date(b.prevista));
      fila.innerHTML = aguardando.length ? aguardando.map((l) => `<li><div class="queue-time">${new Date(l.prevista).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</div><div class="queue-info"><strong>${esc(l.equipamento.nome)}</strong><div class="muted small">${esc(l.solicitante.nome)} · ${esc(l.equipamento.patrimonio)}</div></div><button class="btn btn-sm" type="button" data-receber="${esc(l.chave)}">${usuarioFinal ? "Registrar" : "Receber"}</button></li>`).join("") : '<li class="muted">Nenhum equipamento com devolução prevista para hoje.</li>';
      $("devolvidos-hoje").textContent = registros.filter((l) => l.devolvida && mesmoDia(l.devolvida, hoje)).length;
      $("aguardando-hoje").textContent = aguardando.length;
      $("com-avaria").textContent = registros.filter((l) => l.devolvida && l.condicaoDevolucao === "Danificado").length;
      $("emprestimos-ativos").textContent = registros.filter((l) => !l.devolvida).length;
    }
    function desenharItensRetorno(prefill, selecionarTodos = false) {
      itensContainer.innerHTML = "";
      if (!prefill.length) {
        itensDoGrupo = [];
        itensContainer.innerHTML = usuarioFinal
          ? '<p class="muted">Não há equipamentos emprestados vinculados ao seu cadastro.</p>'
          : '<p class="muted">Abra uma devolução pela página de Empréstimos para carregar os dados do registro.</p>';
        inputPatrimonio.value = "";
        return;
      }
      itensDoGrupo = prefill;
      inputPatrimonio.value = prefill.map((l) => l.equipamento.patrimonio).join(", ");
      itensContainer.innerHTML = `<div class="stack-sm">${prefill.map((l) => `<label class="picked self-return-item" style="cursor:pointer;gap:.75rem"><input type="checkbox" name="itens-devolucao" value="${esc(l.chave)}" ${selecionarTodos || (String(l.id) === String(itemInicial) && (!emprestimoInicial || String(l.emprestimoId) === String(emprestimoInicial))) || (!usuarioFinal && !itemInicial && prefill.length === 1) ? "checked" : ""}><span class="item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H4zM2 20h20M8 16v4m8-4v4"/></svg></span><span class="picked-info"><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}${usuarioFinal ? ` · Devolver até ${esc(new Date(l.prevista).toLocaleDateString("pt-BR", {day:"2-digit", month:"2-digit", year:"numeric"}))}` : ` · ${esc(l.solicitante.nome)} · retirada ${dataHora(l.retirada)}`}</small></span><span class="pill ${EloUtil.prazo(l.prevista).classe === "late" ? "pill-late" : "pill-ok"}">${esc(l.situacao === "atrasado" ? "Prazo passou" : usuarioFinal ? "Com você" : "Emprestado")}</span></label>`).join("")}</div>`;
      if (!itemInicial && !usuarioFinal && prefill.length > 1) itensContainer.querySelectorAll('input[name="itens-devolucao"]').forEach((c) => { c.checked = true; });
    }
    function mostrarRevisao(selecionados) {
      const div = $("revisao-devolucao");
      if (!div) {
        const el = document.createElement("div"); el.id = "revisao-devolucao"; el.className = "alert alert-info"; el.setAttribute("role", "status");
        form.insertBefore(el, $("mensagem-devolucao"));
      }
      const alvo = $("revisao-devolucao");
      alvo.innerHTML = `<strong>Revise antes de confirmar</strong><p>${selecionados.length} item(ns) será(ão) devolvido(s): ${selecionados.map((l) => esc(l.equipamento.nome + " · " + l.equipamento.patrimonio)).join("; ")}</p><p>Condição: ${esc(({bom:"Bom",regular:"Regular",danificado:"Danificado"})[form.querySelector('input[name="condicao"]:checked')?.value || "bom"] || "Bom")}. A hora da operação será registrada no momento da confirmação.</p>`;
      revisar = true; $("confirmar-devolucao").textContent = "Confirmar devolução";
    }

    // Se a seleção/condição mudar depois da revisão, a revisão antiga deixa de valer.
    form.addEventListener("change", () => {
      if (!revisar) return;
      revisar = false;
      $("revisao-devolucao")?.remove();
      $("confirmar-devolucao").textContent = "Revisar devolução";
    });
    abas.forEach((a) => a.addEventListener("click", () => { periodo = a.dataset.periodo; desenharRecentes(); }));
    busca?.addEventListener("input", () => { desenharRecentes(); desenharAtivos(); });
    const selecionarParaDevolucao = (event) => {
      const button = event.target.closest("[data-receber]"); if (!button) return;
      const l = registros.find((x) => x.chave === button.dataset.receber);
      if (l) {
        history.replaceState(null, "", `${location.pathname}?itemId=${encodeURIComponent(l.id)}&emprestimoId=${encodeURIComponent(l.emprestimoId)}`);
        revisar = false; $("revisao-devolucao")?.remove(); $("confirmar-devolucao").textContent = "Revisar devolução";
        itensContainer.innerHTML = ""; desenharItensRetorno([l]); form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    fila.addEventListener("click", selecionarParaDevolucao);
    listaAtivos?.addEventListener("click", selecionarParaDevolucao);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      mensagem.hidden = true;
      const ids = [...form.querySelectorAll('input[name="itens-devolucao"]:checked')].map((c) => c.value);
      if (!ids.length) return aviso(mensagem, "Selecione os equipamentos que estão sendo devolvidos.", "error");
      const selecionados = ids.map((id) => itensDoGrupo.find((l) => l.chave === id)).filter(Boolean);
      if (selecionados.length !== ids.length) return aviso(mensagem, "Atualize a página para carregar os dados dos itens selecionados.", "error");
      const conferencias = [
        [$("acessorios-conferidos"), "Confirme que os cabos e acessórios foram conferidos."],
        [$("equipamento-conferido"), "Confirme a limpeza e a verificação visual do equipamento."],
        [$("assinatura-recebida"), "Confirme o registro da assinatura / recebimento."],
      ];
      const pendente = conferencias.find(([campo]) => campo && !campo.checked);
      if (pendente) { aviso(mensagem, pendente[1], "error"); pendente[0]?.focus(); return; }
      if (!revisar) { mostrarRevisao(selecionados); return; }
      const botao = $("confirmar-devolucao"); botao.disabled = true;
      try {
        const result = await ELO.registrarDevolucao({
          itens: selecionados.map((l) => ({ emprestimoId: l.emprestimoId, equipamentoId: l.equipamento?.id ?? l.id })),
          condicao: form.querySelector('input[name="condicao"]:checked')?.value || "bom",
          observacoes: $("obs").value,
          acessoriosConferidos: $("acessorios-conferidos").checked,
          equipamentoConferido: $("equipamento-conferido").checked,
          assinaturaRecebida: $("assinatura-recebida").checked,
        });
        registros = (await ELO.emprestimos()).filter(pertenceAoUsuario);
        desenharRecentes(); desenharFila(); desenharAtivos();
        history.replaceState(null, "", location.pathname);
        revisar = false;
        form.reset();
        $("confirmar-devolucao").textContent = "Revisar devolução";
        $("revisao-devolucao")?.remove();
        if (result.falhas?.length) {
          const chavesPendentes = new Set(result.falhas.map((falha) => `${falha.emprestimoId}:${falha.equipamentoId}`));
          const pendentes = registros.filter((l) => !l.devolvida && chavesPendentes.has(`${l.emprestimoId}:${l.equipamento?.id ?? l.id}`));
          desenharItensRetorno(pendentes, true);
          aviso(mensagem, `${result.itens} item(ns) devolvido(s); ${result.falhas.length} não pôde(puderam) ser registrado(s). Confira os itens ainda pendentes e tente novamente.`, "error");
          return;
        }
        aviso(mensagem, `${result.itens} ${result.itens === 1 ? "equipamento devolvido" : "equipamentos devolvidos"}. A devolução foi registrada no servidor.`, "ok");
        desenharItensRetorno(usuarioFinal ? registros.filter((l) => !l.devolvida) : []);
      } catch (error) { aviso(mensagem, error.message || "Não foi possível registrar a devolução.", "error"); }
      finally { botao.disabled = false; }
    });

    try {
      registros = (await ELO.emprestimos()).filter(pertenceAoUsuario);
      desenharRecentes(); desenharFila(); desenharAtivos();
      let prefill = [];
      if (itemInicial) {
        const item = registros.find((l) => String(l.id) === String(itemInicial) && !l.devolvida && (!emprestimoInicial || String(l.emprestimoId) === String(emprestimoInicial)));
        if (item) prefill = registros.filter((l) => String(l.emprestimoId) === String(item.emprestimoId) && !l.devolvida);
      } else if (emprestimoInicial) {
        prefill = registros.filter((l) => String(l.emprestimoId) === String(emprestimoInicial) && !l.devolvida);
      } else if (usuarioFinal) {
        prefill = registros.filter((l) => !l.devolvida);
      }
      desenharItensRetorno(prefill);
    } catch (error) {
      aviso(mensagem, error.message || "Não foi possível carregar as devoluções.", "error");
    }
  }

  if (document.body.dataset.pagina === "emprestimos") paginaEmprestimos();
  if (document.body.dataset.pagina === "devolucoes") paginaDevolucoes();
})();
