/* Fluxo de cadastro em duas fases: preenchimento e revisão/confirmacão. */
(() => {
  const form = document.querySelector('form.split[action="#"]');
  if (!form || document.body.dataset.pagina !== "emprestimos") return;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => EloUtil.esc(value ?? "");
  const mensagem = $("emprestimo-mensagem");
  const campoSolicitante = $("solicitante");
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
      const disponiveis = equipamentos.filter((e) => e.situacao === "disponivel");
      $("lista-equipamentos").innerHTML = disponiveis.map((e) => `<option value="${esc(e.patrimonio)}" label="${esc(e.nome)}"></option><option value="${esc(nomeData(e))}"></option>`).join("");
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
    if (!campoSolicitante.value.trim()) return mostrarMensagem("Selecione um solicitante na página Usuários.");
    if (!selecionados.length) return mostrarMensagem("Adicione pelo menos um equipamento antes de continuar.");
    const retirada = new Date($("retirada").value);
    const devolucao = new Date($("devolucao").value);
    if (!Number.isFinite(retirada.getTime()) || !Number.isFinite(devolucao.getTime()) || devolucao <= retirada) return mostrarMensagem("A devolução prevista deve ocorrer depois da retirada.");
    dadosParaConfirmar = {
      solicitante: campoSolicitante.value.split(" · ")[0].trim(),
      matricula: new URLSearchParams(location.search).get("matricula") || "",
      vinculo: campoVinculo.value,
      equipamentos: selecionados.map((e) => e.id),
      retirada: retirada.toISOString(),
      prevista: devolucao.toISOString(),
      finalidade: $("finalidade").value,
      observacoes: $("obs").value.trim(),
    };
    resumoReview.innerHTML = `<div class="stack-sm"><div class="summary-row"><span>Solicitante</span><strong>${esc(dadosParaConfirmar.solicitante)}</strong></div><div class="summary-row"><span>Vínculo</span><strong>${esc(dadosParaConfirmar.vinculo)}</strong></div><div class="summary-row"><span>Retirada</span><strong>${esc(formatarCampoData($("retirada").value))}</strong></div><div class="summary-row"><span>Devolução prevista</span><strong>${esc(formatarCampoData($("devolucao").value))}</strong></div><div><strong>Equipamentos</strong><ul>${selecionados.map((e) => `<li>${esc(e.nome)} · ${esc(e.patrimonio)}</li>`).join("")}</ul></div>${dadosParaConfirmar.observacoes ? `<p><strong>Observações:</strong> ${esc(dadosParaConfirmar.observacoes)}</p>` : ""}</div><p class="muted">A confirmação registrará a operação apenas na fonte local deste navegador até a integração com o servidor.</p>`;
    form.hidden = true;
    formReview.hidden = false;
    $("confirmar-emprestimo").focus();
  });

  $("voltar-edicao").addEventListener("click", () => { formReview.hidden = true; form.hidden = false; });
  $("confirmar-emprestimo").addEventListener("click", async () => {
    if (!dadosParaConfirmar) return mostrarMensagem("Revise os dados antes de confirmar.");
    const botao = $("confirmar-emprestimo"); botao.disabled = true;
    try {
      await ELO.registrarEmprestimo(dadosParaConfirmar);
      location.href = "emprestimos.html?salvo=registrado";
    } catch (error) {
      formReview.hidden = true; form.hidden = false;
      mostrarMensagem(error.message || "Não foi possível registrar o empréstimo.");
    } finally { botao.disabled = false; }
  });
})();
