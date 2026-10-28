/* ELO Campus — cadastro e edição de equipamento
 * Sem ?id= na URL cadastra; com ?id=3 edita o equipamento 3.
 * A validação aqui é só para ajudar o usuário: o back-end valida de novo. */

(async function () {
  const $ = (id) => document.getElementById(id);

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
  const foto = $("f-foto");
  const fotoPreview = $("foto-preview");
  const fotoPreviewImg = $("foto-preview-img");
  let imagem = "";
  let imagemAlterada = false;
  async function reduzirImagem(arquivo, lado = 1280, qualidade = 0.85) {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, lado / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * escala));
    canvas.height = Math.max(1, Math.round(bitmap.height * escala));
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a imagem.");
    contexto.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (typeof bitmap.close === "function") bitmap.close();
    return canvas.toDataURL("image/jpeg", qualidade);
  }
  let identificadorPersonalizado = false;
  let categoriasApi = [];

  const normalizarPatrimonio = (v) => v.trim().toUpperCase();
  const atualizarIdentificador = () => {
    if (!identificadorPersonalizado) {
      identificador.value = normalizarPatrimonio(campos.patrimonio.value);
    }
  };
  identificador.addEventListener("input", () => {
    identificadorPersonalizado = identificador.value.trim() !== "" &&
      identificador.value.trim() !== normalizarPatrimonio(campos.patrimonio.value);
  });
  identificador.addEventListener("blur", () => {
    if (!identificador.value.trim()) {
      identificadorPersonalizado = false;
      atualizarIdentificador();
    }
  });

  function lerDados() {
    return {
      nome: campos.nome.value.trim(),
      patrimonio: normalizarPatrimonio(campos.patrimonio.value),
      categoria: campos.categoria.value.trim(),
      categoria_id: String(categoriasApi.find((c) =>
        String(c.nome || "").trim().toLocaleLowerCase("pt-BR") === campos.categoria.value.trim().toLocaleLowerCase("pt-BR")
        && c.ativo !== false
      )?.id || ""),
      elegibilidade: $("f-elegibilidade")?.value || "todos",
      setor: campos.setor.value.trim(),
      condicao: campos.condicao.value,
      observacoes: campos.observacoes.value.trim(),
      qr_code: identificador.value.trim() || normalizarPatrimonio(campos.patrimonio.value),
      imagem,
      imagemAlterada,
    };
  }

  function validar(d) {
    const m = {};
    if (!d.nome) m.nome = "Informe o nome do equipamento.";
    if (!d.patrimonio) m.patrimonio = "Informe o número de patrimônio.";
    else if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(d.patrimonio))
      m.patrimonio = "Use apenas letras, números, hífen, ponto ou sublinhado.";
    if (!d.categoria) m.categoria = "Informe ou selecione o tipo ou categoria do equipamento.";
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

  const atualizarVisual = () => {
    const categoria = campos.categoria.value.trim().toLowerCase();
    const condicao = campos.condicao.value;
    const visual = $("tipo-visual");
    if (!categoria || !condicao) { visual.hidden = true; return; }
    const visualTipo = ELO_VISUAIS.categoria(categoria);
    const tipo = { simbolo: visualTipo[0], nome: visualTipo[1] };
    $("tipo-silhueta").innerHTML = tipo.simbolo;
    $("tipo-visual-titulo").textContent = `${tipo.nome} · ${condicao}`;
    $("tipo-visual-texto").textContent = condicao === "Danificado"
      ? "Estado danificado: a visualização sinaliza atenção para manutenção."
      : condicao === "Regular" ? "Estado regular: a visualização sinaliza acompanhamento."
      : "Estado bom: a visualização representa o equipamento em condição de uso.";
    visual.dataset.condicao = condicao.toLowerCase();
    visual.hidden = false;
  };
  [campos.categoria, campos.condicao].forEach((campo) => campo.addEventListener("input", atualizarVisual));
  [campos.categoria, campos.condicao].forEach((campo) => campo.addEventListener("change", atualizarVisual));
  foto.addEventListener("change", async () => {
    const arquivo = foto.files?.[0];
    if (!arquivo) return;
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!tiposPermitidos.includes(arquivo.type)) {
      foto.value = "";
      mostrarErroGeral("Escolha uma imagem JPG, PNG, WebP ou GIF. SVG não é aceito.");
      return;
    }
    try {
      imagem = await reduzirImagem(arquivo);
      imagemAlterada = true;
      fotoPreviewImg.src = imagem;
      fotoPreview.hidden = false;
      erroGeral.hidden = true;
    } catch {
      foto.value = "";
      mostrarErroGeral("Não foi possível ler essa imagem. Use JPG, PNG ou WebP.");
    }
  });
  $("remover-foto").addEventListener("click", () => {
    imagem = "";
    imagemAlterada = true;
    foto.value = "";
    fotoPreviewImg.removeAttribute("src");
    fotoPreview.hidden = true;
  });

  // Sugestões são auxiliares: falha numa listagem não deve bloquear o cadastro.
  const preencher = (idLista, valores) => {
    const lista = $(idLista);
    if (!lista) return;
    lista.replaceChildren(...[...new Set(valores.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((v) => new Option(v, v)));
  };

  try {
    categoriasApi = await ELO.categorias();
    preencher("lista-categorias", categoriasApi.filter(c => c.ativo !== false).map(c => c.nome));
  } catch {
    // A API também aceita uma categoria digitada; a lista é apenas uma sugestão.
  }
  try {
    const listaEquipamentos = await ELO.equipamentos();
    preencher("lista-setores", listaEquipamentos.map(e => e.setor));
  } catch {
    // Sugestões de setor não são obrigatórias para salvar.
  }

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
      campos.categoria.value = String(e.categoria || categoriasApi.find(c => String(c.id) === String(e.categoria_id))?.nome || "");
      const qrExistente = String(e.qr_code || e.codigo_qr || "").trim();
      if (qrExistente && qrExistente !== normalizarPatrimonio(e.patrimonio || "")) {
        identificador.value = qrExistente;
        identificadorPersonalizado = true;
      } else {
        identificadorPersonalizado = false;
        atualizarIdentificador();
      }
      if ($("f-elegibilidade")) $("f-elegibilidade").value = e.elegibilidade || "todos";
      campos.setor.value = e.setor ?? "";
      campos.condicao.value = e.condicao ?? "";
      campos.observacoes.value = e.observacoes ?? "";
      imagem = e.imagem || e.foto || "";
      if (imagem) { fotoPreviewImg.src = imagem; fotoPreview.hidden = false; }
      atualizarIdentificador();
      atualizarVisual();
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
