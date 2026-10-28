/* Fluxo de cadastro em duas fases: preenchimento e revisão/confirmacão. */
(() => {
  const form = document.querySelector('form.split[action="#"]');
  if (!form || document.body.dataset.pagina !== "emprestimos") return;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => EloUtil.esc(value ?? "");
  const sessaoAtual = typeof obterSessao === "function" ? obterSessao() : null;
  const perfilAtual = String(sessaoAtual?.perfil || "").toLowerCase();
  const usuarioFinal = ["aluno", "professor"].includes(perfilAtual);
  const parametrosIniciais = new URLSearchParams(location.search);
  if (!sessaoAtual) return; // layout.js já redireciona para o login se não houver sessão.
  if (!parametrosIniciais.get("nome") && ["administrador", "operador"].includes(perfilAtual)) {
    location.replace("usuarios.html?origem=novo-emprestimo");
    return;
  }
  if (!parametrosIniciais.get("nome") && !usuarioFinal) return;
  const mensagem = $("emprestimo-mensagem");
  const campoSolicitante = $("solicitante");
  let solicitantesDisponiveis = [];
  const campoVinculo = $("vinculo");
  const campoEquipamento = $("equip");
  const listaEquipamentos = $("lista-equipamentos-selecionados");
  const formReview = $("revisao-emprestimo");
  const resumoReview = $("resumo-revisao");
  const botaoAdd = $("adicionar-equip");
  let equipamentos = [];
  let selecionados = [];
  let dadosParaConfirmar = null;

  const mostrarMensagem = (texto, tipo = "error") => {
    mensagem.hidden = false;
    mensagem.className = `alert alert-${tipo}`;
    mensagem.textContent = texto;
  };
  const esconderMensagem = () => { mensagem.hidden = true; mensagem.textContent = ""; };
  const dataLocalInput = (d) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const formatarCampoData = (valor) => valor ? EloUtil.dataHora(new Date(valor)) : "—";
  const nomeData = (e) => `${e.nome} — ${e.patrimonio}`;
  const vinculosPerfil = { aluno: "Aluno", professor: "Professor" };

  if (usuarioFinal) {
    const nomeSessao = String(sessaoAtual?.nome || "").trim();
    campoSolicitante.value = nomeSessao;
    campoSolicitante.readOnly = true;
    campoVinculo.value = vinculosPerfil[perfilAtual] || "Aluno";
    campoVinculo.disabled = true;

    // Modo de autoatendimento: o usuário informa apenas o que precisa, não dados
    // administrativos do solicitante ou da rotina interna do acervo.
    const sectionSolicitante = document.querySelector('section[aria-labelledby="t-solicitante"]');
    if (sectionSolicitante) sectionSolicitante.hidden = true;
    const retiradaInterna = $("retirada")?.closest(".field");
    if (retiradaInterna) retiradaInterna.hidden = true;
    document.querySelectorAll("[data-resumo-interno]").forEach((linha) => { linha.hidden = true; });
    const h1 = document.querySelector(".page-head h1");
    const intro = document.querySelector(".page-head p");
    if (h1) h1.textContent = "Reservar equipamento";
    if (intro) intro.textContent = "Escolha os equipamentos e envie sua solicitação para a equipe.";
    const tituloEquipamentos = $("t-equip"); if (tituloEquipamentos) tituloEquipamentos.textContent = "O que você precisa?";
    const labelEquipamento = document.querySelector('label[for="equip"]');
    if (labelEquipamento) labelEquipamento.textContent = "Buscar pelo nome ou código do item";
    campoEquipamento.placeholder = "Digite o nome ou código do equipamento";
    const tituloPrazo = $("t-prazo"); if (tituloPrazo) tituloPrazo.textContent = "Prazo e finalidade";
    const labelObs = document.querySelector('label[for="obs"]');
    if (labelObs) labelObs.textContent = "Observação (opcional)";
    const resumoTitulo = document.querySelector(".summary h2");
    if (resumoTitulo) resumoTitulo.textContent = "Seu pedido";
    const resumoDevolucao = document.querySelector('[data-resumo-prazo] span');
    if (resumoDevolucao) resumoDevolucao.textContent = "Preciso devolver até";
    const termos = document.querySelector(".summary .terms");
    if (termos) termsText(termos, "Confirmo que vou cuidar dos equipamentos e devolver até o prazo informado.");
    const submit = form.querySelector('button[type="submit"]');
    if (submit) submit.textContent = "Revisar pedido";
    const cancelar = form.querySelector("a.cancel");
    if (cancelar) cancelar.href = "dashboard.html";
    const tituloRevisao = $("titulo-revisao"); if (tituloRevisao) tituloRevisao.textContent = "Confirmar solicitação";
    const passos = [...document.querySelectorAll(".steps .step-label")];
    ["Pedido", "Escolha os itens", "Confirmação"].forEach((texto, indice) => { if (passos[indice]) passos[indice].textContent = texto; });
    const textoRevisao = $("texto-revisao-pedido");
    if (textoRevisao) textoRevisao.textContent = "Confira os itens e o prazo antes de enviar sua solicitação.";
    const confirmar = $("confirmar-emprestimo"); if (confirmar) confirmar.textContent = "Confirmar solicitação";
  }

  function termsText(label, text) {
    const input = label.querySelector("input");
    label.textContent = "";
    if (input) label.appendChild(input);
    label.append(document.createTextNode(` ${text}`));
  }

  function desenharSelecionados() {
    const vazio = $("nenhum-equipamento");
    if (!selecionados.length) {
      listaEquipamentos.innerHTML = '<p class="muted" id="nenhum-equipamento">Nenhum equipamento selecionado.</p>';
    } else {
      listaEquipamentos.innerHTML = selecionados.map((e) => `<div class="picked" data-item-id="${esc(e.id)}"><div class="picked-icon" aria-hidden="true">${ELO_VISUAIS.categoria(e.categoria)[0]}</div><div class="picked-info"><strong>${esc(e.nome)}</strong><small>${esc(e.patrimonio)} · ${esc(e.categoria)} · ${esc(e.setor)}</small></div><button class="icon-btn" type="button" data-remover-item="${esc(e.id)}" aria-label="Remover ${esc(e.nome)}">×</button></div>`).join("");
    }
    $("resumo-itens").textContent = `${selecionados.length} equipamento${selecionados.length === 1 ? "" : "s"}`;
    atualizarResumo();
  }
  function atualizarResumo() {
    $("resumo-retirada").textContent = formatarCampoData($("retirada").value);
    $("resumo-devolucao").textContent = formatarCampoData($("devolucao").value);
  }
  function adicionarEquipamento() {
    esconderMensagem();
    const termo = campoEquipamento.value.trim();
    if (!termo) { mostrarMensagem("Digite ou selecione o nome ou patrimônio do equipamento."); campoEquipamento.focus(); return; }
    const base = termo.split(" — ")[0].trim();
    const alvo = equipamentos.find((e) => norm(e.patrimonio) === norm(termo) || norm(e.nome) === norm(termo) || norm(e.patrimonio) === norm(base) || norm(nomeData(e)) === norm(termo));
    if (!alvo) { mostrarMensagem("O equipamento não foi localizado. Use o nome ou patrimônio completo de um equipamento disponível."); campoEquipamento.focus(); return; }
    if (alvo.situacao !== "disponivel") { mostrarMensagem(`${alvo.nome} não está disponível para empréstimo. Situação atual: ${alvo.situacao}.`); campoEquipamento.focus(); return; }
    if (selecionados.some((e) => String(e.id) === String(alvo.id))) { mostrarMensagem("Este equipamento já está na lista.", "info"); campoEquipamento.value = ""; return; }
    selecionados.push(alvo);
    campoEquipamento.value = "";
    desenharSelecionados();
  }
  function norm(s) { return String(s ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }

  (async () => {
    try {
      equipamentos = await ELO.equipamentos();
      if (!usuarioFinal) {
        try {
          solicitantesDisponiveis = (await ELO.solicitantes()).filter(x => x.ativo !== false);
          campoSolicitante.removeAttribute("readonly"); campoSolicitante.type = "text";
          const select = document.createElement("select"); select.id = "solicitante-id-select"; select.className = campoSolicitante.className; select.required = true;
          select.add(new Option("Selecione um solicitante", ""));
          solicitantesDisponiveis.forEach(x => select.add(new Option(`${x.nome} · código ${x.id}`, String(x.id))));
          campoSolicitante.hidden = true; campoSolicitante.required = false; campoSolicitante.parentElement.insertBefore(select, campoSolicitante);
          select.addEventListener("change", () => { const x=solicitantesDisponiveis.find(y=>String(y.id)===select.value); campoSolicitante.value=x?.nome||""; $("resumo-solicitante").textContent=x?`${x.nome} · #${x.id}`:"—"; });
        } catch (e) { mostrarMensagem(`Não foi possível carregar solicitantes: ${e.message}`); }
      }
      const disponiveis = equipamentos.filter((e) => e.situacao === "disponivel");
      $("lista-equipamentos").innerHTML = disponiveis.map((e) => `<option value="${esc(e.patrimonio)}" label="${esc(e.nome)}"></option><option value="${esc(nomeData(e))}"></option>`).join("");
      const itemInicial = parametrosIniciais.get("equipamentoId");
      if (itemInicial) {
        const escolhido = disponiveis.find((e) => String(e.id) === String(itemInicial));
        if (escolhido) {
          selecionados.push(escolhido);
          desenharSelecionados();
        } else {
          mostrarMensagem("Esse equipamento não está disponível neste momento. Escolha outro item do catálogo.", "info");
        }
      }
    } catch (error) {
      mostrarMensagem(`Não foi possível carregar os equipamentos: ${error.message}`);
    }
  })();

  // A retirada inicia com a hora local do navegador, mas não há relógio na interface.
  const agora = new Date();
  const prevista = new Date(agora); prevista.setDate(prevista.getDate() + 1); prevista.setHours(18, 0, 0, 0);
  if (!$('retirada').value) $('retirada').value = dataLocalInput(agora);
  if (!$('devolucao').value) $('devolucao').value = dataLocalInput(prevista);
  atualizarResumo();
  campoSolicitante.addEventListener("input", () => { $("resumo-solicitante").textContent = campoSolicitante.value.split(" · ")[0] || "—"; });
  [$("retirada"), $("devolucao")].forEach((el) => el.addEventListener("change", atualizarResumo));
  botaoAdd.addEventListener("click", adicionarEquipamento);
  campoEquipamento.addEventListener("keydown", (event) => { if (event.key === "Enter") { event.preventDefault(); adicionarEquipamento(); } });
  listaEquipamentos.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-remover-item]"); if (!btn) return;
    selecionados = selecionados.filter((e) => String(e.id) !== String(btn.dataset.removerItem));
    desenharSelecionados();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    esconderMensagem();
    if (!form.reportValidity()) return;
    if (!usuarioFinal && !$("solicitante-id-select")?.value) return mostrarMensagem("Selecione um solicitante cadastrado.");
    if (!selecionados.length) return mostrarMensagem("Adicione pelo menos um equipamento antes de continuar.");
    const retirada = new Date($("retirada").value);
    const devolucao = new Date($("devolucao").value);
    if (!Number.isFinite(retirada.getTime()) || !Number.isFinite(devolucao.getTime()) || devolucao <= retirada) return mostrarMensagem("A devolução prevista deve ocorrer depois da retirada.");
    dadosParaConfirmar = {
      solicitante: usuarioFinal ? String(sessaoAtual?.nome || "").trim() : campoSolicitante.value.trim(),
      solicitante_id: usuarioFinal ? undefined : Number($("solicitante-id-select")?.value),
      matricula: usuarioFinal ? String(sessaoAtual?.matricula || "") : (parametrosIniciais.get("matricula") || ""),
      vinculo: usuarioFinal ? vinculosPerfil[perfilAtual] : campoVinculo.value,
      equipamentos: selecionados.map((e) => e.id),
      retirada: retirada.toISOString(),
      prevista: devolucao.toISOString(),
      finalidade: $("finalidade").value,
      observacoes: $("obs").value.trim(),
    };
    resumoReview.innerHTML = `<div class="stack-sm">${usuarioFinal ? "" : `<div class="summary-row"><span>Solicitante</span><strong>${esc(dadosParaConfirmar.solicitante)}</strong></div><div class="summary-row"><span>Vínculo</span><strong>${esc(dadosParaConfirmar.vinculo)}</strong></div><div class="summary-row"><span>Retirada</span><strong>${esc(formatarCampoData($("retirada").value))}</strong></div>`}<div class="summary-row"><span>Devolução prevista</span><strong>${esc(formatarCampoData($("devolucao").value))}</strong></div><div><strong>Equipamentos</strong><ul>${selecionados.map((e) => `<li>${esc(e.nome)} · ${esc(e.patrimonio)}</li>`).join("")}</ul></div>${dadosParaConfirmar.observacoes ? `<p><strong>Observações:</strong> ${esc(dadosParaConfirmar.observacoes)}</p>` : ""}</div><p class="muted">${usuarioFinal ? "Seu pedido será enviado ao servidor para análise da equipe. O equipamento só estará liberado após aprovação e registro da retirada." : "A confirmação enviará a retirada para registro no sistema oficial."}</p>`;
    form.hidden = true;
    formReview.hidden = false;
    $("confirmar-emprestimo").focus();
  });

  $("voltar-edicao").addEventListener("click", () => { formReview.hidden = true; form.hidden = false; });
  $("confirmar-emprestimo").addEventListener("click", async () => {
    if (!dadosParaConfirmar) return mostrarMensagem("Revise os dados antes de confirmar.");
    const botao = $("confirmar-emprestimo"); botao.disabled = true;
    try {
      if (usuarioFinal) {
        await ELO.criarReserva({ equipamentos: dadosParaConfirmar.equipamentos.map(Number), data_inicio: dadosParaConfirmar.retirada, data_fim: dadosParaConfirmar.prevista, observacoes: [dadosParaConfirmar.finalidade, dadosParaConfirmar.observacoes].filter(Boolean).join(" — ") || null });
        location.href = "reservas.html?salvo=registrado";
      } else {
        await ELO.registrarEmprestimo(dadosParaConfirmar);
        location.href = "emprestimos.html?salvo=registrado";
      }
    } catch (error) {
      formReview.hidden = true; form.hidden = false;
      mostrarMensagem(error.message || "Não foi possível registrar o empréstimo.");
    } finally { botao.disabled = false; }
  });
})();
