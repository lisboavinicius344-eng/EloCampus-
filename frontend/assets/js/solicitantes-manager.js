/* ELO Campus — cadastro de solicitantes, separado das contas de login. */
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const form = $("solicitante-form");
  if (!form) return;

  const aviso = $("solicitantes-aviso");
  const tbody = $("solicitantes-tbody");
  const submit = $("solicitante-salvar");
  const cancel = $("solicitante-cancelar");
  const formId = $("solicitante-form-id");
  const nome = $("solicitante-nome");
  const tipo = $("solicitante-tipo");
  const setor = $("solicitante-setor");
  const email = $("solicitante-email");
  const telefone = $("solicitante-telefone");
  const busca = $("solicitante-busca");
  const filtroStatus = $("solicitante-status");
  const filtroTipo = $("solicitante-filtro-tipo");
  const contagem = $("solicitante-contagem");
  let solicitantes = [];
  let ocupada = false;

  const tipos = {
    aluno: "Discente / Aluno",
    professor: "Docente / Professor",
    servidor: "Servidor",
    tecnico: "Técnico",
    externo: "Externo",
  };
  const normalizar = (valor) => String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

  function mostrarAviso(texto, estado = "info") {
    aviso.textContent = texto;
    aviso.className = `alert ${estado === "ok" ? "alert-ok" : estado === "error" ? "alert-error" : "alert-info"}`;
    aviso.hidden = false;
    const reduzirMovimento = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    aviso.scrollIntoView?.({ block: "nearest", behavior: reduzirMovimento ? "auto" : "smooth" });
  }

  function ocultarAviso() {
    aviso.hidden = true;
    aviso.textContent = "";
  }

  function elemento(tag, texto, classe) {
    const el = document.createElement(tag);
    if (texto !== undefined && texto !== null) el.textContent = String(texto);
    if (classe) el.className = classe;
    return el;
  }

  function celula(linha, texto, classe) {
    const td = elemento("td", texto, classe);
    linha.appendChild(td);
    return td;
  }

  function botaoAcao(texto, classe, acao, desabilitado = false) {
    const botao = elemento("button", texto, `btn btn-ghost ${classe || ""}`.trim());
    botao.type = "button";
    botao.disabled = desabilitado;
    botao.addEventListener("click", acao);
    return botao;
  }

  function listaFiltrada() {
    const termo = normalizar(busca.value);
    return solicitantes.filter((item) => {
      const ativo = item.ativo !== false;
      const porStatus = filtroStatus.value === "todos" || (filtroStatus.value === "ativos" && ativo) || (filtroStatus.value === "inativos" && !ativo);
      const porTipo = !filtroTipo.value || normalizar(item.tipo) === filtroTipo.value;
      const texto = normalizar([item.id, item.nome, tipos[normalizar(item.tipo)] || item.tipo, item.tipo, item.matricula, item.setor, item.email, item.telefone].join(" "));
      return porStatus && porTipo && (!termo || texto.includes(termo));
    });
  }

  function renderizar() {
    const filtrados = listaFiltrada();
    tbody.replaceChildren();
    contagem.textContent = `${filtrados.length} ${filtrados.length === 1 ? "registro" : "registros"}`;
    if (!filtrados.length) {
      const linha = document.createElement("tr");
      const mensagem = elemento("td", solicitantes.length ? "Nenhum solicitante corresponde aos filtros." : "Nenhum solicitante cadastrado na API.", "estado-vazio");
      mensagem.colSpan = 8;
      linha.appendChild(mensagem);
      tbody.appendChild(linha);
      return;
    }

    filtrados.forEach((item) => {
      const linha = document.createElement("tr");
      celula(linha, String(item.id ?? "—"), "solicitante-code");

      const pessoa = document.createElement("td");
      pessoa.appendChild(elemento("span", item.nome || "Nome não informado", "solicitante-primary"));
      pessoa.appendChild(elemento("span", item.setor || "Sem setor informado", "solicitante-secondary"));
      linha.appendChild(pessoa);

      celula(linha, tipos[normalizar(item.tipo)] || item.tipo || "—");
      celula(linha, item.matricula || "—");
      const contato = document.createElement("td");
      contato.appendChild(elemento("span", item.email || "Sem e-mail", "solicitante-primary"));
      contato.appendChild(elemento("span", item.telefone || "Sem telefone", "solicitante-secondary"));
      linha.appendChild(contato);

      const conta = document.createElement("td");
      const temConta = item.tem_conta === true || item.tem_conta === 1 || ["true", "1"].includes(String(item.tem_conta).toLowerCase());
      conta.appendChild(elemento("span", temConta ? "Conta criada" : "Sem conta", `solicitante-status ${temConta ? "is-active" : "is-inactive"}`));
      linha.appendChild(conta);

      const ativo = item.ativo !== false;
      const status = document.createElement("td");
      status.appendChild(elemento("span", ativo ? "Ativo" : "Inativo", `solicitante-status ${ativo ? "is-active" : "is-inactive"}`));
      linha.appendChild(status);

      const acoes = document.createElement("td");
      const agrupador = elemento("div", undefined, "solicitante-actions");
      agrupador.appendChild(botaoAcao("Editar", "", () => iniciarEdicao(item)));
      if (ativo) agrupador.appendChild(botaoAcao("Desativar", "", () => desativar(item)));
      acoes.appendChild(agrupador);
      linha.appendChild(acoes);
      tbody.appendChild(linha);
    });
  }

  async function carregar({ silencioso = false } = {}) {
    const atualiza = $("solicitantes-atualizar");
    if (atualiza) { atualiza.disabled = true; atualiza.textContent = "Atualizando…"; }
    tbody.replaceChildren();
    const carregando = document.createElement("tr");
    const celulaCarregando = elemento("td", "Consultando solicitantes na API…", "estado-vazio");
    celulaCarregando.colSpan = 8;
    carregando.appendChild(celulaCarregando);
    tbody.appendChild(carregando);
    try {
      const resultado = await ELO.solicitantes();
      solicitantes = Array.isArray(resultado) ? resultado : [];
      renderizar();
      if (!silencioso) ocultarAviso();
    } catch (erro) {
      solicitantes = [];
      tbody.replaceChildren();
      const linha = document.createElement("tr");
      const mensagem = elemento("td", "Não foi possível carregar os solicitantes. Confirme a sessão e se a API disponibiliza GET /solicitantes para este perfil.", "estado-vazio");
      mensagem.colSpan = 8;
      linha.appendChild(mensagem);
      tbody.appendChild(linha);
      contagem.textContent = "—";
      mostrarAviso(erro.message || "Não foi possível consultar os solicitantes.", "error");
    } finally {
      if (atualiza) { atualiza.disabled = false; atualiza.textContent = "Atualizar lista"; }
    }
  }

  function limparFormulario() {
    form.reset();
    $("solicitante-matricula").value = "";
    formId.value = "";
    tipo.value = "aluno";
    $("solicitante-form-titulo").textContent = "Novo solicitante";
    submit.textContent = "Cadastrar solicitante";
    cancel.hidden = true;
  }

  function iniciarEdicao(item) {
    ocultarAviso();
    formId.value = String(item.id);
    nome.value = item.nome || "";
    tipo.value = tipos[normalizar(item.tipo)] ? normalizar(item.tipo) : "aluno";
    setor.value = item.setor || "";
    email.value = item.email || "";
    $("solicitante-matricula").value = item.matricula || "";
    telefone.value = item.telefone || "";
    $("solicitante-form-titulo").textContent = `Editar solicitante #${item.id}`;
    submit.textContent = "Salvar alterações";
    cancel.hidden = false;
    const reduzirMovimento = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    form.scrollIntoView?.({ block: "start", behavior: reduzirMovimento ? "auto" : "smooth" });
    nome.focus({ preventScroll: true });
  }

  async function desativar(item) {
    if (ocupada) return;
    const confirmar = window.confirm(`Desativar o cadastro de ${item.nome}? O histórico será preservado, mas o cadastro não poderá ser usado em novos fluxos.`);
    if (!confirmar) return;
    ocupada = true;
    try {
      await ELO.desativarSolicitante(item.id);
      mostrarAviso(`Solicitante #${item.id} desativado. O registro histórico foi preservado.`, "ok");
      await carregar({ silencioso: true });
    } catch (erro) {
      mostrarAviso(erro.message || "Não foi possível desativar o solicitante.", "error");
    } finally {
      ocupada = false;
    }
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    ocultarAviso();
    if (ocupada) return;
    const dados = {
      nome: nome.value.trim(),
      tipo: tipo.value,
      setor: setor.value.trim(),
      email: email.value.trim().toLowerCase(),
      matricula: $("solicitante-matricula").value.trim(),
      telefone: telefone.value.trim(),
    };
    if (dados.nome.split(/\s+/).filter(Boolean).length < 2) {
      mostrarAviso("Informe o nome completo do solicitante.", "error"); nome.focus(); return;
    }
    if (!Object.prototype.hasOwnProperty.call(tipos, dados.tipo)) {
      mostrarAviso("Selecione um vínculo válido.", "error"); tipo.focus(); return;
    }
    if (["aluno", "professor"].includes(dados.tipo) && !dados.email) {
      mostrarAviso("O e-mail é obrigatório para aluno e professor.", "error"); email.focus(); return;
    }
    if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) {
      mostrarAviso("Informe um e-mail válido.", "error"); email.focus(); return;
    }

    ocupada = true;
    const id = formId.value.trim();
    submit.disabled = true;
    submit.textContent = id ? "Salvando…" : "Cadastrando…";
    try {
      const resposta = id ? await ELO.salvarSolicitante(id, dados) : await ELO.criarSolicitante(dados);
      const registro = resposta?.solicitante || resposta?.data?.solicitante || null;
      if (id) {
        mostrarAviso(resposta?.mensagem || `Cadastro do solicitante #${id} atualizado.`, "ok");
      } else {
        mostrarAviso(resposta?.mensagem || "Solicitante cadastrado.", "ok");
      }
      limparFormulario();
      await carregar({ silencioso: true });
    } catch (erro) {
      mostrarAviso(erro.message || "Não foi possível salvar o solicitante. Confira os dados e tente novamente.", "error");
    } finally {
      ocupada = false;
      submit.disabled = false;
      submit.textContent = formId.value ? "Salvar alterações" : "Cadastrar solicitante";
    }
  });

  cancel.addEventListener("click", () => { limparFormulario(); ocultarAviso(); });
  $("solicitantes-atualizar").addEventListener("click", () => carregar());
  busca.addEventListener("input", renderizar);
  filtroStatus.addEventListener("change", renderizar);
  filtroTipo.addEventListener("change", renderizar);
  carregar();
})();
