/* Reservas — o aluno/professor reserva; a equipe aprova e registra a retirada,
 * que cria o empréstimo. Um só script atende três telas, escolhidas por
 * <body data-view>:
 *   reservar (novo-emprestimo.html) · minhas (minhas-reservas.html) · equipe (reservas.html)
 * Depende de api.js (ELO) e layout.js (EloUtil).
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (v) => EloUtil.esc(v ?? "");
  const view = document.body.dataset.view;
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const perfil = String(sessao?.perfil || "").toLowerCase();
  const equipe = ["administrador", "operador"].includes(perfil);
  if (!sessao) return; // layout.js já redireciona para o login.

  const ROTULO = { pendente: "Pendente", aprovada: "Aprovada", retirada: "Retirada", concluida: "Concluída", rejeitada: "Rejeitada", cancelada: "Cancelada" };
  const CLASSE = { pendente: "pill-warn", aprovada: "pill-ok", retirada: "pill-ok", concluida: "pill-ok", rejeitada: "pill-late", cancelada: "pill-late" };
  const pill = (s) => `<span class="pill ${CLASSE[s] || ""}">${esc(ROTULO[s] || s || "—")}</span>`;

  // requisitar() já transforma o campo "erro" da API em error.message.
  const aviso = (texto, tipo = "error") => {
    const el = $("reserva-mensagem");
    if (!el) return;
    el.hidden = !texto;
    el.className = `alert alert-${tipo}`;
    el.textContent = texto || "";
  };
  const fmt = (v) => {
    const d = new Date(v);
    return v && !isNaN(d) ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
  };
  const periodo = (r) => `${fmt(r.data_inicio)} → ${fmt(r.data_fim)}`;
  const itensDe = (r) => r.equipamentos || r.itens || [];
  const nomeItem = (e) => (typeof e === "object" ? (e.nome || e.equipamento || e.descricao || `#${e.equipamento_id ?? e.id}`) : `#${e}`);
  const patrimonioItem = (e) => (typeof e === "object" ? (e.numero_patrimonio || e.patrimonio || "") : "");
  const equipamentosHtml = (r) => itensDe(r).map((e) => `${esc(nomeItem(e))}${patrimonioItem(e) ? ` <span class="muted">(${esc(patrimonioItem(e))})</span>` : ""}`).join("<br>") || "—";
  const equipamentosTexto = (r) => itensDe(r).map((e) => `${nomeItem(e)} ${patrimonioItem(e)}`).join(" ");
  const solicitanteDe = (r) => (typeof r.solicitante === "object" && r.solicitante ? r.solicitante.nome : r.solicitante) || r.solicitante_nome || "—";
  const norm = (s) => String(s ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const linhaVazia = (tbody, cols, texto) => { tbody.innerHTML = `<tr><td colspan="${cols}" class="muted">${esc(texto)}</td></tr>`; };
  const dataLocalInput = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const paraISO = (valor) => new Date(valor).toISOString(); // a API exige fuso horário

  /* ---------- Aluno / professor / servidor: reservar ---------- */
  function iniciarReservar() {
    if (equipe) { location.replace("reservas.html"); return; }
    const form = $("form-reserva"), campo = $("equip"), lista = $("lista-equipamentos-selecionados");
    let catalogo = [], selecionados = [];
    const rotulo = (e) => `${e.nome} — ${e.patrimonio}`;

    const desenhar = () => {
      lista.innerHTML = selecionados.length
        ? selecionados.map((e) => `<div class="picked"><div class="picked-icon" aria-hidden="true">${typeof ELO_VISUAIS !== "undefined" ? ELO_VISUAIS.categoria(e.categoria)[0] : ""}</div><div class="picked-info"><strong>${esc(e.nome)}</strong><small>${esc(e.patrimonio)} · ${esc(e.categoria)} · ${esc(e.setor)}</small></div><button class="icon-btn" type="button" data-remover-item="${esc(e.id)}" aria-label="Remover ${esc(e.nome)}">×</button></div>`).join("")
        : '<p class="muted" id="nenhum-equipamento">Nenhum equipamento selecionado.</p>';
      $("resumo-itens").textContent = `${selecionados.length} equipamento${selecionados.length === 1 ? "" : "s"}`;
    };
    const resumoDatas = () => {
      $("resumo-inicio").textContent = $("data-inicio").value ? fmt($("data-inicio").value) : "—";
      $("resumo-fim").textContent = $("data-fim").value ? fmt($("data-fim").value) : "—";
    };
    const adicionar = () => {
      aviso("");
      const termo = campo.value.trim();
      if (!termo) { aviso("Digite ou selecione o nome ou patrimônio do equipamento."); campo.focus(); return; }
      const base = termo.split(" — ")[0].trim();
      const alvo = catalogo.find((e) => norm(e.patrimonio) === norm(termo) || norm(e.nome) === norm(termo) || norm(e.patrimonio) === norm(base) || norm(rotulo(e)) === norm(termo));
      if (!alvo) { aviso("Equipamento não localizado. Use o nome ou patrimônio de um item da lista."); campo.focus(); return; }
      if (selecionados.some((e) => String(e.id) === String(alvo.id))) { aviso("Este equipamento já está na lista.", "info"); campo.value = ""; return; }
      selecionados.push(alvo);
      campo.value = "";
      desenhar();
    };

    (async () => {
      try {
        // Reserva vale para datas futuras: itens hoje emprestados também entram.
        // A API recusa conflito de horário, manutenção, elegibilidade e atraso.
        catalogo = (await ELO.equipamentos()).filter((e) => !["inativo", "manutencao"].includes(e.situacao));
        $("lista-equipamentos").innerHTML = catalogo.map((e) => `<option value="${esc(e.patrimonio)}" label="${esc(e.nome)}"></option><option value="${esc(rotulo(e))}"></option>`).join("");
        const inicial = new URLSearchParams(location.search).get("equipamentoId");
        const item = inicial && catalogo.find((e) => String(e.id) === String(inicial));
        if (item) { selecionados.push(item); desenhar(); }
        else if (inicial) aviso("Esse equipamento não está disponível para reserva. Escolha outro item.", "info");
      } catch (e) { aviso(`Não foi possível carregar os equipamentos: ${e.message}`); }
    })();

    const agora = new Date();
    const fim = new Date(agora); fim.setDate(fim.getDate() + 1); fim.setHours(18, 0, 0, 0);
    $("data-inicio").value = dataLocalInput(agora);
    $("data-fim").value = dataLocalInput(fim);
    resumoDatas(); desenhar();

    $("adicionar-equip").addEventListener("click", adicionar);
    campo.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); adicionar(); } });
    lista.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-remover-item]"); if (!b) return;
      selecionados = selecionados.filter((e) => String(e.id) !== String(b.dataset.removerItem));
      desenhar();
    });
    ["data-inicio", "data-fim"].forEach((id) => $(id).addEventListener("change", resumoDatas));

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      aviso("");
      if (!selecionados.length) return aviso("Adicione pelo menos um equipamento.");
      const ini = new Date($("data-inicio").value), fimData = new Date($("data-fim").value);
      if (isNaN(ini) || isNaN(fimData)) return aviso("Informe o início e o fim da reserva.");
      if (fimData <= ini) return aviso("O fim da reserva deve ser depois do início.");
      if (!$("aceite").checked) return aviso("Confirme o termo de responsabilidade para continuar.");
      const finalidade = $("finalidade").value, obs = $("obs").value.trim();
      const botao = $("enviar-reserva"); botao.disabled = true;
      try {
        await ELO.criarReserva({
          equipamentos: selecionados.map((e) => Number(e.id)),
          data_inicio: paraISO($("data-inicio").value),
          data_fim: paraISO($("data-fim").value),
          observacoes: [finalidade, obs].filter(Boolean).join(" — ") || null,
        });
        location.href = "minhas-reservas.html?criada=1";
      } catch (e) {
        aviso(e.message); // conflito de horário, manutenção, só professores, empréstimo atrasado…
        botao.disabled = false;
      }
    });
  }

  /* ---------- Aluno / professor / servidor: minhas reservas ---------- */
  function iniciarMinhas() {
    const tbody = $("lista-reservas");
    if (new URLSearchParams(location.search).get("criada")) aviso("Reserva enviada! Aguarde a aprovação da equipe.", "ok");
    const carregar = async () => {
      try {
        const lista = await ELO.reservas();
        if (!lista.length) return linhaVazia(tbody, 4, "Você ainda não tem reservas.");
        tbody.innerHTML = lista.map((r) => {
          const pode = r.status === "pendente" || r.status === "aprovada";
          return `<tr><td>${equipamentosHtml(r)}</td><td>${esc(periodo(r))}</td><td>${pill(r.status)}</td><td>${pode ? `<button class="btn btn-line" type="button" data-cancelar="${esc(r.id)}">Cancelar</button>` : ""}</td></tr>`;
        }).join("");
      } catch (e) { linhaVazia(tbody, 4, e.message); }
    };
    tbody.addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-cancelar]");
      if (!b || !confirm("Cancelar esta reserva?")) return;
      b.disabled = true;
      try { await ELO.cancelarReserva(b.dataset.cancelar); aviso("Reserva cancelada.", "ok"); await carregar(); }
      catch (e) { aviso(e.message); b.disabled = false; }
    });
    carregar();
  }

  /* ---------- Equipe: reservas ---------- */
  function iniciarEquipe() {
    const tbody = $("lista-reservas"), dlg = $("dlg-retirada");
    let todas = [], filtro = "", termo = "", alvo = null;

    const visiveis = () => todas.filter((r) => {
      if (filtro === "encerradas" ? !["rejeitada", "cancelada"].includes(r.status) : (filtro && r.status !== filtro)) return false;
      return !termo || norm(`${solicitanteDe(r)} ${equipamentosTexto(r)}`).includes(termo);
    });
    const acoes = (r) => {
      const id = esc(r.id);
      if (r.status === "pendente") return `<button class="btn" type="button" data-acao="aprovar" data-id="${id}">Aprovar</button> <button class="btn btn-line" type="button" data-acao="rejeitar" data-id="${id}">Rejeitar</button>`;
      if (r.status === "aprovada") return `<button class="btn" type="button" data-acao="retirar" data-id="${id}">Registrar retirada</button>`;
      return "";
    };
    const desenhar = () => {
      const lista = visiveis();
      if (!lista.length) return linhaVazia(tbody, 5, "Nenhuma reserva encontrada.");
      tbody.innerHTML = lista.map((r) => `<tr><td>${esc(solicitanteDe(r))}</td><td>${equipamentosHtml(r)}</td><td>${esc(periodo(r))}</td><td>${pill(r.status)}</td><td>${acoes(r)}</td></tr>`).join("");
    };
    const recarregar = async () => {
      try { todas = await ELO.reservas(); desenhar(); } catch (e) { linhaVazia(tbody, 5, e.message); }
    };

    document.querySelector(".tabs").addEventListener("click", (ev) => {
      const t = ev.target.closest(".tab"); if (!t) return;
      document.querySelectorAll(".tabs .tab").forEach((x) => x.setAttribute("aria-selected", String(x === t)));
      filtro = t.dataset.filtro; desenhar();
    });
    $("busca").addEventListener("input", (ev) => { termo = norm(ev.target.value.trim()); desenhar(); });

    tbody.addEventListener("click", async (ev) => {
      const b = ev.target.closest("[data-acao]"); if (!b) return;
      const { id, acao } = b.dataset;
      aviso("");
      if (acao === "retirar") {
        alvo = todas.find((r) => String(r.id) === id);
        $("dlg-retirada-sub").textContent = `${solicitanteDe(alvo)} · ${periodo(alvo)}`;
        $("ret-devolucao").value = ""; $("ret-obs").value = ""; $("dlg-retirada-erro").hidden = true;
        dlg.showModal();
        return;
      }
      b.disabled = true;
      try {
        await (acao === "aprovar" ? ELO.aprovarReserva(id) : ELO.rejeitarReserva(id));
        aviso(acao === "aprovar" ? "Reserva aprovada." : "Reserva rejeitada.", "ok");
        await recarregar();
      } catch (e) { aviso(e.message); b.disabled = false; }
    });

    $("ret-cancelar").addEventListener("click", () => dlg.close());
    $("form-retirada").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!alvo) return;
      const corpo = {}, dev = $("ret-devolucao").value, obs = $("ret-obs").value.trim();
      if (dev) corpo.data_prevista_devolucao = paraISO(dev);
      if (obs) corpo.observacoes = obs;
      const botao = $("ret-confirmar"); botao.disabled = true;
      try {
        const resp = await ELO.retirarReserva(alvo.id, corpo);
        const emp = resp?.emprestimo || resp;
        dlg.close();
        aviso(`Retirada registrada${emp?.id ? ` — empréstimo #${emp.id} criado` : ""}. Acompanhe em Empréstimos.`, "ok");
        await recarregar();
      } catch (e) {
        const box = $("dlg-retirada-erro"); box.textContent = e.message; box.hidden = false;
      } finally { botao.disabled = false; }
    });

    recarregar();
  }

  ({ reservar: iniciarReservar, minhas: iniciarMinhas, equipe: iniciarEquipe })[view]?.();
})();
