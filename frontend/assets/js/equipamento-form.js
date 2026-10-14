/* ELO Campus — cadastro e edição de equipamento
 * Sem ?id= na URL cadastra; com ?id=3 edita o equipamento 3.
 * A validação aqui é só para ajudar o usuário: o back-end valida de novo. */

(async function () {
  const $ = (id) => document.getElementById(id);
  const { esc } = EloUtil;

  const id = new URLSearchParams(window.location.search).get("id");
  const form = $("eq-form");
  const botao = $("salvar");
  const erroGeral = $("erro");
  const textoBotao = id ? "Salvar alterações" : "Salvar equipamento";

  const campos = {
    nome: $("f-nome"),
    patrimonio: $("f-patrimonio"),
    categoria: $("f-categoria"),
    setor: $("f-setor"),
    condicao: $("f-condicao"),
    observacoes: $("f-obs"),
  };
  const spansErro = {
    nome: $("e-nome"),
    patrimonio: $("e-patrimonio"),
    categoria: $("e-categoria"),
    setor: $("e-setor"),
    condicao: $("e-condicao"),
    observacoes: $("e-obs"),
  };
  const identificador = $("f-identificador");

  const normalizarPatrimonio = (v) => v.trim().toUpperCase();
  const atualizarIdentificador = () => {
    identificador.value = normalizarPatrimonio(campos.patrimonio.value);
  };

  function lerDados() {
    return {
      nome: campos.nome.value.trim(),
      patrimonio: normalizarPatrimonio(campos.patrimonio.value),
      categoria: campos.categoria.value.trim(),
      setor: campos.setor.value.trim(),
      condicao: campos.condicao.value,
      observacoes: campos.observacoes.value.trim(),
    };
  }

  function validar(d) {
    const m = {};
    if (!d.nome) m.nome = "Informe o nome do equipamento.";
    if (!d.patrimonio) m.patrimonio = "Informe o número de patrimônio.";
    else if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(d.patrimonio))
      m.patrimonio = "Use apenas letras, números, hífen, ponto ou sublinhado.";
    if (!d.categoria) m.categoria = "Informe o tipo ou categoria.";
    if (!d.setor) m.setor = "Informe o setor responsável.";
    if (!d.condicao) m.condicao = "Selecione a condição física.";
    return m;
  }

  function limparErros() {
    erroGeral.hidden = true;
    Object.keys(campos).forEach((k) => {
      spansErro[k].textContent = "";
      campos[k].removeAttribute("aria-invalid");
    });
  }

  function mostrarErros(msgs) {
    let primeiro = null;
    Object.entries(msgs).forEach(([campo, texto]) => {
      if (!campos[campo]) return;
      spansErro[campo].textContent = texto;
      campos[campo].setAttribute("aria-invalid", "true");
      if (!primeiro) primeiro = campos[campo];
    });
    if (primeiro) primeiro.focus();
  }

  function mostrarErroGeral(texto) {
    erroGeral.textContent = texto;
    erroGeral.hidden = false;
  }

  // Limpa o erro de um campo assim que a pessoa volta a digitar nele
  Object.keys(campos).forEach((k) => {
    campos[k].addEventListener("input", () => {
      spansErro[k].textContent = "";
      campos[k].removeAttribute("aria-invalid");
    });
  });
  campos.patrimonio.addEventListener("input", atualizarIdentificador);

  // Sugestões de tipo e setor a partir do que já existe (se falhar, segue sem elas)
  try {
    const lista = await ELO.equipamentos();
    const preencher = (idLista, campo) => {
      const valores = [...new Set(lista.map((e) => e[campo]).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
      $(idLista).innerHTML = valores.map((v) => `<option value="${esc(v)}"></option>`).join("");
    };
    preencher("lista-categorias", "categoria");
    preencher("lista-setores", "setor");
  } catch { /* sugestões são opcionais */ }

  // Modo edição
  if (id) {
    $("titulo").textContent = "Editar equipamento";
    $("subtitulo").textContent = "Altere os dados e salve. O patrimônio continua único.";
    document.title = "Editar equipamento — ELO Campus";
    botao.textContent = textoBotao;
    botao.disabled = true;
    try {
      const e = await ELO.equipamento(id);
      campos.nome.value = e.nome ?? "";
      campos.patrimonio.value = e.patrimonio ?? "";
      campos.categoria.value = e.categoria ?? "";
      campos.setor.value = e.setor ?? "";
      campos.condicao.value = e.condicao ?? "";
      campos.observacoes.value = e.observacoes ?? "";
      atualizarIdentificador();
      botao.disabled = false;
    } catch (err) {
      mostrarErroGeral(err.message);
      return; // sem dados não há o que editar: o botão continua desabilitado
    }
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limparErros();

    const dados = lerDados();
    const msgs = validar(dados);
    if (Object.keys(msgs).length) { mostrarErros(msgs); return; }

    botao.disabled = true;
    botao.textContent = "Salvando…";

    try {
      await ELO.salvarEquipamento(dados, id);
      window.location.href = `equipamentos.html?salvo=${id ? "editado" : "criado"}`;
    } catch (err) {
      // Erros 409/422 do servidor trazem o campo (ex.: patrimônio duplicado)
      if (err.campo && campos[err.campo]) mostrarErros({ [err.campo]: err.message });
      else mostrarErroGeral(err.message);
      botao.disabled = false;
      botao.textContent = textoBotao;
    }
  });
})();