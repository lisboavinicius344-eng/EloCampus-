/* Fluxo de cadastro em duas fases: preenchimento e revisão/confirmacão. */
(() => {
  const form = document.querySelector('form.split[action="#"]');
  if (!form || document.body.dataset.pagina !== "emprestimos") return;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => EloUtil.esc(value ?? "");
  const sessaoAtual = typeof obterSessao === "function" ? obterSessao() : null;
  const perfilAtual = String(sessaoAtual?.perfil || "").toLowerCase();
  const mostrarIdsPessoas = sessaoAtual?.master === true;
  const usuarioFinal = ["aluno", "professor", "servidor"].includes(perfilAtual);
  const parametrosIniciais = new URLSearchParams(location.search);
  if (!sessaoAtual) return; // layout.js já redireciona para o login se não houver sessão.
  const mensagem = $("emprestimo-mensagem");
  const campoSolicitante = $("solicitante");
  let solicitantesDisponiveis = [];
  let solicitanteSelecionado = null;
  const campoVinculo = $("vinculo");
  const campoVinculoDetalhe = $("vinculo-detalhe");
  const vinculoDetalheWrap = $("vinculo-detalhe-wrap");
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
  const vinculosPerfil = { aluno: "aluno", professor: "professor", servidor: "servidor" };
  const rotulosVinculo = { aluno: "Discente / Aluno", professor: "Docente / Professor", servidor: "Servidor / TAE", grupo_setor: "Grupo ou setor", outro: "Outro" };
  const normalizarBusca = (valor) => norm(valor).replace(/\s+/g, " ").trim();
  function atualizarCampoVinculo() {
    const exigeDetalhe = ["grupo_setor", "outro"].includes(campoVinculo.value);
    if (vinculoDetalheWrap) vinculoDetalheWrap.hidden = !exigeDetalhe;
    if (campoVinculoDetalhe) {
      campoVinculoDetalhe.required = exigeDetalhe;
      const label = document.querySelector('label[for="vinculo-detalhe"]');
      if (label) label.textContent = campoVinculo.value === "outro" ? "Explique o vínculo" : "Nome do grupo ou setor";
      if (!exigeDetalhe) campoVinculoDetalhe.value = "";
    }
  }
  campoVinculo.addEventListener("change", atualizarCampoVinculo);
  atualizarCampoVinculo();

  if (!usuarioFinal) {
    // A retirada efetiva é registrada pelo servidor no momento da operação; não aceite uma data local que a API ignora.
    const retirada = $("retirada");
    if (retirada) retirada.readOnly = true;
    const labelRetirada = document.querySelector('label[for="retirada"]');
    if (labelRetirada) labelRetirada.textContent = "Retirada (registrada pelo servidor)";
  }

  if (usuarioFinal) {
    const nomeSessao = String(sessaoAtual?.nome || "").trim();
    campoSolicitante.value = nomeSessao;
    campoSolicitante.readOnly = true;
    campoVinculo.value = vinculosPerfil[perfilAtual] || "servidor";
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
    $("resumo-retirada").textContent = usuarioFinal
      ? formatarCampoData($("retirada").value)
      : "No momento da confirmação (horário do servidor)";
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
      if (campoVinculoDetalhe && $("lista-setores-vinculo")) {
        const setores = [...new Set(equipamentos.map(e => String(e.setor || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));
        $("lista-setores-vinculo").replaceChildren(...setores.map(setor => new Option(setor, setor)));
      }
      if (!usuarioFinal) {
        try {
          solicitantesDisponiveis = (await ELO.solicitantes()).filter(x => x.ativo !== false);
          campoSolicitante.type = "search";
          campoSolicitante.removeAttribute("readonly");
          campoSolicitante.setAttribute("list", "lista-solicitantes");
          campoSolicitante.placeholder = mostrarIdsPessoas ? "Pesquise por nome, matrícula ou ID" : "Pesquise por nome, matrícula ou e-mail";
          campoSolicitante.required = true;
          const lista = $("lista-solicitantes");
          const identificadorVisivel = (pessoa) => pessoa.matricula || (mostrarIdsPessoas ? pessoa.id : pessoa.email) || (mostrarIdsPessoas ? "cadastro sem matrícula" : "sem e-mail");
          const rotuloSolicitante = (pessoa) => `${pessoa.nome} · ${identificadorVisivel(pessoa)}`;
          lista.replaceChildren(...solicitantesDisponiveis.map(x => new Option(rotuloSolicitante(x), rotuloSolicitante(x))));
          const selecionarSolicitante = () => {
            const termo = normalizarBusca(campoSolicitante.value);
            solicitanteSelecionado = solicitantesDisponiveis.find(x =>
              normalizarBusca(x.nome) === termo ||
              normalizarBusca(rotuloSolicitante(x)) === termo ||
              normalizarBusca(x.matricula) === termo ||
              normalizarBusca(x.email) === termo ||
              normalizarBusca(String(x.id)) === termo
            ) || null;
            if (solicitanteSelecionado) {
              const tipo = normalizarBusca(solicitanteSelecionado.tipo);
              campoVinculo.value = tipo.includes("prof") ? "professor" : tipo.includes("serv") || tipo.includes("tecn") ? "servidor" : "aluno";
              campoVinculo.disabled = true; // o vínculo vem do cadastro da pessoa
              const identificadorResumo = mostrarIdsPessoas
                ? [solicitanteSelecionado.matricula, `#${solicitanteSelecionado.id}`].filter(Boolean).join(" · ")
                : (solicitanteSelecionado.matricula || solicitanteSelecionado.email);
              $("resumo-solicitante").textContent = `${solicitanteSelecionado.nome}${identificadorResumo ? ` · ${identificadorResumo}` : ""}`;
            } else {
              $("resumo-solicitante").textContent = "Selecione um cadastro válido";
              campoVinculo.disabled = false;
            }
            atualizarCampoVinculo();
          };
          campoSolicitante.addEventListener("change", selecionarSolicitante);
          campoSolicitante.addEventListener("blur", selecionarSolicitante);
          selecionarSolicitante();
          campoSolicitante.addEventListener("input", () => {
            const termo = normalizarBusca(campoSolicitante.value);
            if (!solicitantesDisponiveis.some(x => normalizarBusca(rotuloSolicitante(x)) === termo || normalizarBusca(x.nome) === termo || normalizarBusca(x.matricula) === termo || normalizarBusca(x.email) === termo || normalizarBusca(String(x.id)) === termo)) {
              solicitanteSelecionado = null;
              $("resumo-solicitante").textContent = "Selecione um cadastro válido";
              campoVinculo.disabled = false;
            }
          });
        } catch (e) { mostrarMensagem(`Não foi possível carregar solicitantes: ${e.message}`); }
      }
      const disponiveis = equipamentos.filter((e) => e.situacao === "disponivel");
      $("lista-equipamentos").innerHTML = disponiveis.map((e) => `<option value="${esc(e.patrimonio)}" label="${esc(e.nome)}"></option><option value="${esc(nomeData(e))}"></option>`).join("");
      const idsIniciais = [
        ...parametrosIniciais.getAll("equipamentoId"),
        ...(parametrosIniciais.get("equipamentos") || "").split(",").filter(Boolean),
      ].map(String);
      const idsUnicos = [...new Set(idsIniciais)];
      if (idsUnicos.length) {
        idsUnicos.forEach((id) => {
          const escolhido = disponiveis.find((e) => String(e.id) === id);
          if (escolhido && !selecionados.some((item) => String(item.id) === id)) selecionados.push(escolhido);
        });
        desenharSelecionados();
        if (selecionados.length !== idsUnicos.length) mostrarMensagem("Um ou mais equipamentos da reserva anterior não estão mais disponíveis. Confira a seleção antes de continuar.", "info");
      }
      const inicioInicial = parametrosIniciais.get("inicio");
      const fimInicial = parametrosIniciais.get("fim");
      const aplicarDataInicial = (id, valor) => {
        if (!valor) return;
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return;
        $(id).value = dataLocalInput(data);
      };
      aplicarDataInicial("retirada", inicioInicial);
      aplicarDataInicial("devolucao", fimInicial);
    } catch (error) {
      mostrarMensagem(`Não foi possível carregar os equipamentos: ${error.message}`);
    }
  })();

  // A retirada inicia com a hora local do navegador, mas não há relógio na interface.
  const agora = new Date();
  const inicioPadrao = new Date(agora); if (usuarioFinal) inicioPadrao.setHours(inicioPadrao.getHours() + 1);
  const prevista = new Date(inicioPadrao); prevista.setDate(prevista.getDate() + 1); prevista.setHours(18, 0, 0, 0);
  const maxData = new Date(usuarioFinal ? agora : agora); maxData.setDate(maxData.getDate() + (usuarioFinal ? 30 : 15));
  $("retirada").min = dataLocalInput(usuarioFinal ? inicioPadrao : agora);
  $("retirada").max = dataLocalInput(usuarioFinal ? maxData : agora);
  $("devolucao").min = dataLocalInput(usuarioFinal ? inicioPadrao : agora);
  if (!$('retirada').value) $('retirada').value = dataLocalInput(inicioPadrao);
  if (!$('devolucao').value) $('devolucao').value = dataLocalInput(prevista);
  const ajustarLimiteDevolucao = () => {
    const base = new Date($("retirada").value || inicioPadrao);
    const limite = new Date(base); limite.setDate(limite.getDate() + (usuarioFinal ? 7 : 15));
    $("devolucao").min = dataLocalInput(usuarioFinal ? base : agora);
    $("devolucao").max = dataLocalInput(limite);
    if ($("devolucao").value && new Date($("devolucao").value) > limite) $("devolucao").value = dataLocalInput(limite);
  };
  ajustarLimiteDevolucao();
  atualizarResumo();
  campoSolicitante.addEventListener("input", () => { $("resumo-solicitante").textContent = campoSolicitante.value.split(" · ")[0] || "—"; });
  $("retirada").addEventListener("change", () => { ajustarLimiteDevolucao(); atualizarResumo(); });
  $("devolucao").addEventListener("change", atualizarResumo);
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
    if (!usuarioFinal && (!solicitanteSelecionado || String(campoSolicitante.value).trim() === "")) return mostrarMensagem("Pesquise e selecione um solicitante cadastrado pelo nome ou matrícula.");
    if (!usuarioFinal && campoVinculo.value === "outro" && !campoVinculoDetalhe.value.trim()) return mostrarMensagem("Explique o vínculo selecionado em ‘Outro’ antes de continuar.");
    if (!selecionados.length) return mostrarMensagem("Adicione pelo menos um equipamento antes de continuar.");
    const retirada = new Date($("retirada").value);
    const devolucao = new Date($("devolucao").value);
    if (!Number.isFinite(retirada.getTime()) || !Number.isFinite(devolucao.getTime()) || devolucao <= retirada) return mostrarMensagem("A devolução prevista deve ocorrer depois da retirada.");
    const limiteDias = usuarioFinal ? 7 : 15; const limitePeriodo = new Date(retirada); limitePeriodo.setDate(limitePeriodo.getDate() + limiteDias);
    if (usuarioFinal && (retirada <= agora || retirada > maxData)) return mostrarMensagem("A reserva deve começar no futuro e ser feita com no máximo 30 dias de antecedência.");
    if (devolucao > limitePeriodo) return mostrarMensagem(usuarioFinal ? "A reserva pode durar no máximo 7 dias." : "O prazo máximo de empréstimo é de 15 dias.");
    dadosParaConfirmar = {
      solicitante: usuarioFinal ? String(sessaoAtual?.nome || "").trim() : campoSolicitante.value.trim(),
      solicitante_id: usuarioFinal ? undefined : String(solicitanteSelecionado?.id || ""),
      matricula: usuarioFinal ? String(sessaoAtual?.matricula || "") : (parametrosIniciais.get("matricula") || ""),
      vinculo: usuarioFinal ? vinculosPerfil[perfilAtual] : campoVinculo.value,
      equipamentos: selecionados.map((e) => e.id),
      retirada: retirada.toISOString(),
      prevista: devolucao.toISOString(),
      finalidade: $("finalidade").value,
      observacoes: [$("obs").value.trim(), (!usuarioFinal && campoVinculo.value === "grupo_setor" ? `Grupo/setor: ${campoVinculoDetalhe.value.trim()}` : ""), (!usuarioFinal && campoVinculo.value === "outro" ? `Vínculo: ${campoVinculoDetalhe.value.trim()}` : "")].filter(Boolean).join(" — "),
    };
    const identificadorConfirmacao = !usuarioFinal && solicitanteSelecionado
      ? (mostrarIdsPessoas
        ? [solicitanteSelecionado.matricula, `#${solicitanteSelecionado.id}`].filter(Boolean).join(" · ")
        : (solicitanteSelecionado.matricula || solicitanteSelecionado.email))
      : "";
    resumoReview.innerHTML = `<div class="stack-sm">${usuarioFinal ? "" : `<div class="summary-row"><span>Solicitante</span><strong>${esc(dadosParaConfirmar.solicitante)}${identificadorConfirmacao ? ` · ${esc(identificadorConfirmacao)}` : ""}</strong></div><div class="summary-row"><span>Vínculo</span><strong>${esc(rotulosVinculo[dadosParaConfirmar.vinculo] || dadosParaConfirmar.vinculo)}${dadosParaConfirmar.vinculo === "grupo_setor" ? ` · ${esc(campoVinculoDetalhe.value.trim())}` : ""}</strong></div><div class="summary-row"><span>Retirada</span><strong>No momento da confirmação (horário do servidor)</strong></div>`}<div class="summary-row"><span>Devolução prevista</span><strong>${esc(formatarCampoData($("devolucao").value))}</strong></div><div><strong>Equipamentos</strong><ul>${selecionados.map((e) => `<li>${esc(e.nome)} · ${esc(e.patrimonio)}</li>`).join("")}</ul></div>${dadosParaConfirmar.observacoes ? `<p><strong>Observações:</strong> ${esc(dadosParaConfirmar.observacoes)}</p>` : ""}</div><p class="muted">${usuarioFinal ? "Seu pedido será enviado ao servidor para análise da equipe. O equipamento só estará liberado após aprovação e registro da retirada." : "A confirmação enviará a retirada para registro no sistema oficial."}</p>`;
    form.hidden = true;
    formReview.hidden = false;
    $("confirmar-emprestimo").focus();
  });

  $("voltar-edicao").addEventListener("click", () => { formReview.hidden = true; form.hidden = false; });
  $("confirmar-emprestimo").addEventListener("click", async () => {
    if (!dadosParaConfirmar) return mostrarMensagem("Revise os dados antes de confirmar.");
    const botao = $("confirmar-emprestimo"); botao.disabled = true;
    try {
      const emprestimosAtuais = await ELO.emprestimos();
      const idSolicitanteSelecionado = usuarioFinal ? String(sessaoAtual?.solicitante_id ?? "") : String(dadosParaConfirmar.solicitante_id ?? "");
      // Sem ID do solicitante, só se compara com os empréstimos da própria pessoa; nunca bloqueia por atraso de terceiros.
      const temAtraso = emprestimosAtuais.some((item) => item.situacao === "atrasado" && (idSolicitanteSelecionado
        ? String(item.solicitante?.id ?? "") === idSolicitanteSelecionado
        : usuarioFinal && EloUtil.pertenceAoUsuario(item, sessaoAtual)));
      if (temAtraso) throw new Error("Há equipamento em atraso vinculado a este solicitante. Regularize a devolução antes de reservar ou retirar outro equipamento.");
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
