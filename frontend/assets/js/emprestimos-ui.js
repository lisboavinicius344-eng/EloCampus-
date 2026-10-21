/* Interações das páginas Empréstimos e Devoluções.
 * Todas as gravações neste modo são locais; a integração oficial virá pela camada ELO.
 */
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
    const usuarioFinal = ["aluno", "professor"].includes(String(sessao?.perfil || "").toLowerCase());
    const chaveNome = (valor) => norm(valor).replace(/\s+/g, " ").trim();
    let registros = [], filtro = "ativos", selecionado = null;

    const grupoDa = (l) => registros.filter((x) => String(x.emprestimoId) === String(l.emprestimoId));
    function filtrar() {
      const termo = norm(busca?.value.trim());
      return registros.filter((l) => {
        const ativo = !l.devolvida;
        const atrasado = ativo && EloUtil.diasAtraso(l.prevista) > 0;
        const statusOK = filtro === "ativos" ? ativo : filtro === "atrasados" ? atrasado : !ativo;
        const texto = [l.equipamento?.nome, l.equipamento?.patrimonio, l.solicitante?.nome, l.registradoPor, l.finalidade].join(" ");
        return statusOK && (!termo || norm(texto).includes(termo));
      });
    }
    function desenharDetalhe(l) {
      selecionado = l;
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
      link.href = l.devolvida ? "devolucoes.html" : `devolucoes.html?itemId=${encodeURIComponent(l.id)}&emprestimoId=${encodeURIComponent(l.emprestimoId)}`;
      link.setAttribute("aria-disabled", String(Boolean(l.devolvida)));
      link.classList.toggle("is-disabled", Boolean(l.devolvida));
    }
    function renderizar() {
      const filtrados = filtrar();
      abas.forEach((aba) => {
        const chave = aba.dataset.filtro;
        const total = registros.filter((l) => chave === "ativos" ? !l.devolvida : chave === "atrasados" ? (!l.devolvida && EloUtil.diasAtraso(l.prevista) > 0) : Boolean(l.devolvida)).length;
        const rotulos = { ativos: "Ativos", atrasados: "Atrasados", historico: "Histórico" };
        aba.textContent = `${rotulos[chave] || aba.textContent} · ${total}`;
        aba.setAttribute("aria-selected", String(chave === filtro));
      });
      if (!filtrados.length) {
        corpo.innerHTML = `<tr><td colspan="5" class="muted">${registros.length ? "Nenhum empréstimo corresponde ao filtro selecionado." : "Não há empréstimos disponíveis na fonte de dados local."}</td></tr>`;
        desenharDetalhe(null);
        return;
      }
      corpo.innerHTML = filtrados.map((l) => {
        const status = statusEmprestimo(l);
        return `<tr data-item-id="${esc(l.id)}"${status.classe === "pill-late" ? ' class="is-late"' : ""}>
          <td><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}${grupoDa(l).length > 1 ? ` · ${grupoDa(l).length} itens no empréstimo` : ""}</small></td>
          <td>${esc(l.solicitante.nome)}<small>por ${esc(l.registradoPor || "—")}</small></td>
          <td>${dataHora(l.devolvida || l.prevista)}</td>
          <td><span class="pill ${status.classe}">${esc(status.texto)}</span></td>
          <td>${l.devolvida ? '<span class="muted small">Concluído</span>' : usuarioFinal ? '<span class="muted small">Em aberto</span>' : `<button class="btn btn-sm" type="button" data-devolver="${esc(l.id)}">Devolver</button>`}</td>
        </tr>`;
      }).join("");
      const activeSelection = filtrados.find((l) => String(l.id) === String(selecionado?.id)) || filtrados[0];
      desenharDetalhe(activeSelection);
    }

    abas.forEach((aba) => aba.addEventListener("click", () => { filtro = aba.dataset.filtro; renderizar(); }));
    busca?.addEventListener("input", renderizar);
    corpo.addEventListener("click", (event) => {
      const devolver = event.target.closest("[data-devolver]");
      const row = event.target.closest("tr[data-item-id]");
      if (devolver) {
        const l = registros.find((x) => String(x.id) === String(devolver.dataset.devolver));
        if (l && !l.devolvida) location.href = `devolucoes.html?itemId=${encodeURIComponent(l.id)}&emprestimoId=${encodeURIComponent(l.emprestimoId)}`;
        return;
      }
      if (row) {
        const l = registros.find((x) => String(x.id) === String(row.dataset.itemId));
        if (l) desenharDetalhe(l);
      }
    });
    try {
      const carregados = await ELO.emprestimos();
      registros = usuarioFinal ? carregados.filter((l) => chaveNome(l.solicitante?.nome) === chaveNome(sessao?.nome)) : carregados;
      if (usuarioFinal) {
        const titulo = document.querySelector(".page-head h1");
        const descricao = document.querySelector(".page-head p");
        if (titulo) titulo.textContent = "Meus empréstimos";
        if (descricao) descricao.textContent = "Consulte a situação e os prazos dos equipamentos vinculados ao seu cadastro.";
      }
      renderizar();
      const salvo = new URLSearchParams(location.search).get("salvo");
      if (salvo === "registrado") {
        const msg = document.createElement("div");
        msg.className = "alert alert-ok"; msg.setAttribute("role", "status");
        msg.textContent = "Empréstimo registrado na fonte local deste navegador. Não é um registro oficial do servidor.";
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
    const query = new URLSearchParams(location.search);
    const itemInicial = query.get("itemId");
    const emprestimoInicial = query.get("emprestimoId");
    const busca = $("busca");
    const abas = [...document.querySelectorAll("[data-periodo]")];
    const corpoRecentes = $("lista-devolucoes-recentes");
    const fila = $("fila-devolucao");
    const inputPatrimonio = $("patrimonio");
    const itensContainer = $("itens-devolucao");
    const mensagem = $("mensagem-devolucao");
    let registros = [], periodo = "hoje", itensDoGrupo = [], revisar = false;

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
        const pill = cond === "Com avaria" ? "pill-late" : cond === "Incompleto" ? "pill-warn" : "pill-ok";
        return `<tr><td><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)}</small></td><td>${esc(l.solicitante.nome)}<small>recebido por ${esc(l.responsavelDevolucao || "—")}</small></td><td>${dataHora(l.devolvida)}</td><td><span class="pill ${pill}">${esc(cond)}</span></td></tr>`;
      }).join("") : `<tr><td colspan="4" class="muted">${registros.some((l) => l.devolvida) ? "Nenhuma devolução corresponde ao período ou à pesquisa." : "Nenhuma devolução registrada na fonte local."}</td></tr>`;
    }
    function desenharFila() {
      const hoje = new Date();
      const aguardando = registros.filter((l) => !l.devolvida && mesmoDia(l.prevista, hoje)).sort((a,b) => new Date(a.prevista) - new Date(b.prevista));
      fila.innerHTML = aguardando.length ? aguardando.map((l) => `<li><div class="queue-time">${new Date(l.prevista).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}</div><div class="queue-info"><strong>${esc(l.equipamento.nome)}</strong><div class="muted small">${esc(l.solicitante.nome)} · ${esc(l.equipamento.patrimonio)}</div></div><button class="btn btn-sm" type="button" data-receber="${esc(l.id)}">Receber</button></li>`).join("") : '<li class="muted">Nenhum equipamento com devolução prevista para hoje.</li>';
      $("devolvidos-hoje").textContent = registros.filter((l) => l.devolvida && mesmoDia(l.devolvida, hoje)).length;
      $("aguardando-hoje").textContent = aguardando.length;
      $("com-avaria").textContent = registros.filter((l) => l.devolvida && l.condicaoDevolucao === "Com avaria").length;
    }
    function desenharItensRetorno(prefill) {
      itensContainer.innerHTML = "";
      if (!prefill.length) {
        itensContainer.innerHTML = '<p class="muted">Abra uma devolução pela página de Empréstimos para carregar os dados do registro.</p>';
        inputPatrimonio.value = "";
        return;
      }
      itensDoGrupo = prefill;
      inputPatrimonio.value = prefill.map((l) => l.equipamento.patrimonio).join(", ");
      itensContainer.innerHTML = `<div class="stack-sm">${prefill.map((l) => `<label class="picked" style="cursor:pointer;gap:.75rem"><input type="checkbox" name="itens-devolucao" value="${esc(l.id)}" ${String(l.id) === String(itemInicial) || (!itemInicial && prefill.length === 1) ? "checked" : ""}><span class="item-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H4zM2 20h20M8 16v4m8-4v4"/></svg></span><span class="picked-info"><strong>${esc(l.equipamento.nome)}</strong><small>${esc(l.equipamento.patrimonio)} · ${esc(l.solicitante.nome)} · retirada ${dataHora(l.retirada)}</small></span><span class="pill ${EloUtil.prazo(l.prevista).classe === "late" ? "pill-late" : "pill-ok"}">${esc(l.situacao === "atrasado" ? "Atrasado" : "Emprestado")}</span></label>`).join("")}</div>`;
      if (!itemInicial && prefill.length > 1) itensContainer.querySelectorAll('input[name="itens-devolucao"]').forEach((c) => { c.checked = true; });
    }
    function mostrarRevisao(selecionados) {
      const div = $("revisao-devolucao");
      if (!div) {
        const el = document.createElement("div"); el.id = "revisao-devolucao"; el.className = "alert alert-info"; el.setAttribute("role", "status");
        form.insertBefore(el, $("mensagem-devolucao"));
      }
      const alvo = $("revisao-devolucao");
      alvo.innerHTML = `<strong>Revise antes de confirmar</strong><p>${selecionados.length} item(ns) será(ão) devolvido(s): ${selecionados.map((l) => esc(l.equipamento.nome + " · " + l.equipamento.patrimonio)).join("; ")}</p><p>Condição: ${esc(form.querySelector('input[name="condicao"]:checked')?.value || "Perfeito")}. A hora da operação será registrada no momento da confirmação.</p>`;
      revisar = true; $("confirmar-devolucao").textContent = "Confirmar devolução";
    }

    abas.forEach((a) => a.addEventListener("click", () => { periodo = a.dataset.periodo; desenharRecentes(); }));
    busca?.addEventListener("input", desenharRecentes);
    fila.addEventListener("click", (event) => {
      const button = event.target.closest("[data-receber]"); if (!button) return;
      const l = registros.find((x) => String(x.id) === String(button.dataset.receber));
      if (l) {
        history.replaceState(null, "", `${location.pathname}?itemId=${encodeURIComponent(l.id)}&emprestimoId=${encodeURIComponent(l.emprestimoId)}`);
        itensContainer.innerHTML = ""; desenharItensRetorno([l]); form.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      mensagem.hidden = true;
      const ids = [...form.querySelectorAll('input[name="itens-devolucao"]:checked')].map((c) => c.value);
      if (!ids.length) return aviso(mensagem, "Selecione os equipamentos que estão sendo devolvidos.", "error");
      const selecionados = ids.map((id) => itensDoGrupo.find((l) => String(l.id) === String(id))).filter(Boolean);
      if (selecionados.length !== ids.length) return aviso(mensagem, "Atualize a página para carregar os dados dos itens selecionados.", "error");
      if (!revisar) { mostrarRevisao(selecionados); return; }
      const botao = $("confirmar-devolucao"); botao.disabled = true;
      try {
        const result = await ELO.registrarDevolucao({
          itens: ids,
          condicao: form.querySelector('input[name="condicao"]:checked')?.value || "Perfeito",
          observacoes: $("obs").value,
          acessoriosConferidos: $("acessorios-conferidos").checked,
          equipamentoConferido: $("equipamento-conferido").checked,
          assinaturaRecebida: $("assinatura-recebida").checked,
        });
        registros = await ELO.emprestimos();
        desenharRecentes(); desenharFila();
        aviso(mensagem, `${result.itens} equipamento(s) devolvido(s) às ${new Date(result.devolvidoEm).toLocaleTimeString("pt-BR", {hour:"2-digit",minute:"2-digit"})}. Alteração salva localmente neste navegador; não é um registro oficial do servidor.`, "ok");
        history.replaceState(null, "", location.pathname);
        revisar = false;
        desenharItensRetorno([]);
        form.reset();
        $("confirmar-devolucao").textContent = "Revisar devolução";
        $("revisao-devolucao")?.remove();
      } catch (error) { aviso(mensagem, error.message || "Não foi possível registrar a devolução.", "error"); }
      finally { botao.disabled = false; }
    });

    try {
      registros = await ELO.emprestimos();
      desenharRecentes(); desenharFila();
      let prefill = [];
      if (itemInicial) {
        const item = registros.find((l) => String(l.id) === String(itemInicial) && !l.devolvida);
        if (item) prefill = registros.filter((l) => String(l.emprestimoId) === String(item.emprestimoId) && !l.devolvida);
      } else if (emprestimoInicial) {
        prefill = registros.filter((l) => String(l.emprestimoId) === String(emprestimoInicial) && !l.devolvida);
      }
      desenharItensRetorno(prefill);
    } catch (error) {
      aviso(mensagem, error.message || "Não foi possível carregar as devoluções.", "error");
    }
  }

  if (document.body.dataset.pagina === "emprestimos") paginaEmprestimos();
  if (document.body.dataset.pagina === "devolucoes") paginaDevolucoes();
})();
