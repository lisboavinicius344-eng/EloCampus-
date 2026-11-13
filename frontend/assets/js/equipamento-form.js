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
  const quantidade = $("f-quantidade");
  const patrimonioInicial = $("f-patrimonio-inicial");
  const lote = $("cadastro-lote");
  const previewPatrimonios = $("patrimonios-preview");
  const campoMarca = $("f-marca");
  const campoCor = $("f-cor");
  const campoFoto = $("f-foto");
  const previewWrap = $("foto-preview-wrap");
  const previewFoto = $("foto-preview");
  const erroFoto = $("e-foto");
  let fotoSelecionada = null;
  let urlPreviewFoto = "";
  const cadastroEmLote = !id && Boolean(lote && quantidade && patrimonioInicial);
  if (lote) lote.hidden = !cadastroEmLote;
  const valorInicial = (v) => String(v || "").trim().toUpperCase();
  function patrimonioSequencial(inicial, total) {
    const bruto = valorInicial(inicial);
    const faixa = bruto.match(/^(.*?)(\d+)-(\d+)$/);
    if (faixa) {
      const prefixo = faixa[1];
      const inicio = Number(faixa[2]);
      const fim = Number(faixa[3]);
      const largura = Math.max(faixa[2].length, faixa[3].length);
      if (Number.isSafeInteger(inicio) && Number.isSafeInteger(fim) && fim >= inicio && fim - inicio < 500) {
        return Array.from({ length: fim - inicio + 1 }, (_, i) => `${prefixo}${String(inicio + i).padStart(largura, "0")}`);
      }
    }
    const encontrado = bruto.match(/^(.*?)(\d+)$/);
    if (!encontrado) return total === 1 && bruto ? [bruto] : [];
    const prefixo = encontrado[1];
    const numero = Number(encontrado[2]);
    const largura = encontrado[2].length;
    if (!Number.isSafeInteger(numero) || !Number.isSafeInteger(total) || total < 1 || total > 500) return [];
    return Array.from({ length: total }, (_, i) => `${prefixo}${String(numero + i).padStart(largura, "0")}`);
  }
  function atualizarPreviewLote() {
    if (!cadastroEmLote || !previewPatrimonios) return;
    const total = Number(quantidade.value || 0);
    const lista = patrimonioSequencial(patrimonioInicial.value, total);
    if (!total || !patrimonioInicial.value.trim()) { previewPatrimonios.textContent = "Informe a quantidade e o patrimônio inicial para visualizar a faixa."; return; }
    if (!lista.length) { previewPatrimonios.textContent = "O patrimônio inicial deve terminar com um número, como 0015 ou TECLADO-0015."; return; }
    previewPatrimonios.textContent = `${lista.length} patrimônios: ${lista[0]} até ${lista.at(-1)}.`;
  }
  quantidade?.addEventListener("input", atualizarPreviewLote);
  patrimonioInicial?.addEventListener("input", atualizarPreviewLote);
  campoFoto?.addEventListener("change", () => {
    erroFoto.textContent = "";
    const arquivo = campoFoto.files?.[0] || null;
    if (!arquivo) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(arquivo.type)) {
      campoFoto.value = ""; fotoSelecionada = null; erroFoto.textContent = "Selecione uma imagem JPG, PNG, WEBP ou GIF."; return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      campoFoto.value = ""; fotoSelecionada = null; erroFoto.textContent = "A imagem deve ter no máximo 5 MB."; return;
    }
    fotoSelecionada = arquivo;
    if (urlPreviewFoto) URL.revokeObjectURL(urlPreviewFoto);
    urlPreviewFoto = URL.createObjectURL(arquivo);
    previewFoto.src = urlPreviewFoto;
    previewWrap.hidden = false;
  });
  $("foto-remover")?.addEventListener("click", () => {
    campoFoto.value = ""; fotoSelecionada = null; previewWrap.hidden = true;
    if (urlPreviewFoto) URL.revokeObjectURL(urlPreviewFoto);
    urlPreviewFoto = ""; previewFoto.removeAttribute("src");
  });
  let categoriasApi = [];
  const textoCategoria = () => campos.categoria.selectedOptions[0]?.textContent.trim() || "";

  const normalizarPatrimonio = (v) => v.trim().toUpperCase();

  function lerDados(patrimonio = campos.patrimonio.value) {
    const patrimonioFinal = normalizarPatrimonio(patrimonio);
    return {
      nome: campos.nome.value.trim(),
      patrimonio: patrimonioFinal,
      categoria: campos.categoria.value ? textoCategoria() : "",
      categoria_id: campos.categoria.value,
      elegibilidade: $("f-elegibilidade")?.value || "todos",
      setor: campos.setor.value.trim(),
      marca: campoMarca?.value.trim() || "",
      cor: campoCor?.value.trim() || "",
      condicao: campos.condicao.value,
      observacoes: campos.observacoes.value.trim(),
      qr_code: patrimonioFinal,
      foto: fotoSelecionada,
    };
  }

  function validar(d) {
    const m = {};
    if (!d.nome) m.nome = "Informe o nome do equipamento.";
    if (!d.patrimonio) m.patrimonio = "Informe o número de patrimônio.";
    else if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(d.patrimonio))
      m.patrimonio = "Use apenas letras, números, hífen, ponto ou sublinhado.";
    if (!d.categoria_id) m.categoria = "Selecione uma categoria. Se não houver nenhuma, crie uma com “Nova categoria”.";
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
      if (campo === "quantidade") { $("e-quantidade").textContent = texto; return; }
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
  const atualizarVisual = () => {
    const categoria = campos.categoria.value ? textoCategoria().toLowerCase() : "";
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
  // Sugestões são auxiliares: falha numa listagem não deve bloquear o cadastro.
  const preencher = (idLista, valores) => {
    const lista = $(idLista);
    if (!lista) return;
    lista.replaceChildren(...[...new Set(valores.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((v) => new Option(v, v)));
  };

  // Monta a lista de categorias ativas; "selecionar" mantém ou define a opção escolhida.
  function montarCategorias(selecionar = campos.categoria.value, extra = null) {
    const ativas = categoriasApi.filter((c) => c.ativo !== false);
    if (extra && !ativas.some((c) => String(c.id) === String(extra.id))) ativas.push(extra);
    ativas.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    campos.categoria.replaceChildren(
      new Option(ativas.length ? "Selecione uma categoria" : "Nenhuma categoria cadastrada", ""),
      ...ativas.map((c) => new Option(c.nome, String(c.id)))
    );
    campos.categoria.value = selecionar ? String(selecionar) : "";
  }

  try {
    categoriasApi = await ELO.categorias();
    montarCategorias("");
  } catch (err) {
    montarCategorias("");
    mostrarErroGeral(err.message || "Não foi possível carregar as categorias.");
  }

  // Criação rápida de categoria, sem sair do formulário
  const painelNova = $("nova-categoria");
  const botaoNova = $("nova-categoria-btn");
  const erroNova = $("nc-erro");
  botaoNova.addEventListener("click", () => {
    painelNova.hidden = !painelNova.hidden;
    botaoNova.setAttribute("aria-expanded", String(!painelNova.hidden));
    if (!painelNova.hidden) $("nc-nome").focus();
  });
  $("nc-salvar").addEventListener("click", async () => {
    const nome = $("nc-nome").value.trim();
    erroNova.textContent = "";
    if (!nome) { erroNova.textContent = "Informe o nome da categoria."; $("nc-nome").focus(); return; }
    const salvar = $("nc-salvar");
    salvar.disabled = true;
    try {
      const r = await ELO.criarCategoria({ nome, descricao: $("nc-desc").value });
      categoriasApi = await ELO.categorias();
      const criada = r?.categoria || categoriasApi.find((c) =>
        String(c.nome || "").trim().toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"));
      montarCategorias(criada?.id ?? "");
      spansErro.categoria.textContent = "";
      campos.categoria.removeAttribute("aria-invalid");
      atualizarVisual();
      $("nc-nome").value = "";
      $("nc-desc").value = "";
      painelNova.hidden = true;
      botaoNova.setAttribute("aria-expanded", "false");
      campos.categoria.focus();
    } catch (err) {
      erroNova.textContent = err.message;
    } finally {
      salvar.disabled = false;
    }
  });
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
      if (e.imagem || e.imagem_url || e.foto) {
        const imagemAtual = e.imagem || e.imagem_url || e.foto;
        previewFoto.src = /^https?:\/\//i.test(imagemAtual) ? imagemAtual : `${API_BASE_URL}${imagemAtual}`;
        previewWrap.hidden = false;
        const hintFoto = campoFoto?.parentElement?.querySelector(".hint");
        if (hintFoto) hintFoto.textContent = "Foto atual do equipamento. Selecione outro arquivo para substituí-la.";
      }
      campos.nome.value = e.nome ?? "";
      campos.patrimonio.value = e.patrimonio ?? "";
      const idCat = e.categoria_id ?? categoriasApi.find((c) => c.nome === e.categoria)?.id ?? "";
      // Categoria já desativada continua aparecendo para não perder o vínculo ao editar.
      montarCategorias(idCat, idCat !== "" ? { id: idCat, nome: e.categoria || `Categoria #${idCat}` } : null);
      if ($("f-elegibilidade")) $("f-elegibilidade").value = e.elegibilidade || "todos";
      if (campoMarca) campoMarca.value = e.marca ?? e.fabricante ?? "";
      if (campoCor) campoCor.value = e.cor ?? "";
      campos.setor.value = e.setor ?? "";
      campos.condicao.value = e.condicao ?? "";
      campos.observacoes.value = e.observacoes ?? "";
      atualizarVisual();
      botao.disabled = false;
    } catch (err) {
      mostrarErroGeral(err.message);
      return; // sem dados não há o que editar: o botão continua desabilitado
    }
  }

  function arquivoParaDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result || ""));
      leitor.onerror = () => reject(new Error("Não foi possível ler a imagem selecionada."));
      leitor.readAsDataURL(arquivo);
    });
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    limparErros();

    const faixaInformada = /^(.*?)(\d+)-(\d+)$/.test(valorInicial(patrimonioInicial?.value));
    const quantidadeInformada = Number(quantidade?.value || 0);
    const patrimoniosPrevia = cadastroEmLote ? patrimonioSequencial(patrimonioInicial.value, faixaInformada ? 1 : quantidadeInformada) : [campos.patrimonio.value];
    const total = cadastroEmLote ? (faixaInformada ? patrimoniosPrevia.length : quantidadeInformada) : 1;
    const patrimonios = cadastroEmLote ? patrimonioSequencial(patrimonioInicial.value, total) : [campos.patrimonio.value];
    const dadosBase = lerDados(patrimonios[0] || campos.patrimonio.value);
    const msgs = validar(dadosBase);
    if (cadastroEmLote) {
      if (!Number.isInteger(total) || total < 1 || total > 500) msgs.quantidade = "Informe uma quantidade entre 1 e 500, ou uma faixa válida.";
      if (!patrimonios.length || patrimonios.length !== total) msgs.quantidade = "Informe um patrimônio inicial terminado em número, como 0015, ou uma faixa como 0015-0030.";
      if (new Set(patrimonios).size !== patrimonios.length) msgs.quantidade = "A faixa gerada contém patrimônios repetidos.";
      if (patrimonios.some((p) => !/^[A-Z0-9][A-Z0-9._-]*$/.test(p))) msgs.quantidade = "Use apenas letras, números, hífen, ponto ou sublinhado nos patrimônios.";
    }
    if (Object.keys(msgs).length) { mostrarErros(msgs); if (msgs.quantidade) $("e-quantidade").textContent = msgs.quantidade; return; }

    botao.disabled = true;
    botao.textContent = cadastroEmLote ? `Salvando 0/${patrimonios.length}…` : "Salvando…";

    try {
      let foto = dadosBase.foto;
      if (foto instanceof File) foto = await arquivoParaDataUrl(foto);
      for (let i = 0; i < patrimonios.length; i += 1) {
        const dados = { ...dadosBase, patrimonio: patrimonios[i], qr_code: patrimonios[i], foto };
        await ELO.salvarEquipamento(dados, id);
        if (cadastroEmLote) botao.textContent = `Salvando ${i + 1}/${patrimonios.length}…`;
      }
      window.location.href = `equipamentos.html?salvo=${id ? "editado" : "criado"}${cadastroEmLote ? `&quantidade=${patrimonios.length}` : ""}`;
    } catch (err) {
      if (err.campo && campos[err.campo]) mostrarErros({ [err.campo]: err.message });
      else mostrarErroGeral(err.message);
      botao.disabled = false;
      botao.textContent = textoBotao;
    }
  });
})();
