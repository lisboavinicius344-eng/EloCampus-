/* ELO Campus — impressão de etiquetas com QR Code (somente equipe).
 * Sem parâmetros: todos os equipamentos que não foram baixados.
 * ?ids=1,2,3: só os equipamentos indicados (inclusive baixados, se escolhidos de propósito).
 * ?imprimir=1: abre a caixa de impressão assim que os QR Codes terminarem de carregar. */
(async function () {
  const $ = (id) => document.getElementById(id);
  const { esc } = EloUtil;
  const parametros = new URLSearchParams(location.search);
  const idsPedidos = (parametros.get("ids") || "").split(",").map((v) => v.trim()).filter(Boolean);
  const imprimirAoAbrir = parametros.get("imprimir") === "1";
  const folha = $("folha-etiquetas");
  const resumo = $("etiquetas-resumo");
  const aviso = $("etiquetas-aviso");
  const botaoImprimir = $("etiquetas-imprimir");

  const mostrarAviso = (texto, tipo = "info") => {
    aviso.className = `alert alert-${tipo} no-print`;
    aviso.textContent = texto;
    aviso.hidden = false;
  };

  // Espera os QR Codes (ou suas falhas) antes de imprimir, senão a folha sai em branco.
  function aguardarImagens(timeoutMs = 10000) {
    const imagens = [...folha.querySelectorAll("img")];
    const pendentes = imagens.map((img) => (img.complete ? Promise.resolve() : new Promise((ok) => {
      img.addEventListener("load", ok, { once: true });
      img.addEventListener("error", ok, { once: true });
    })));
    return Promise.race([Promise.all(pendentes), new Promise((ok) => setTimeout(ok, timeoutMs))]);
  }

  function etiquetaHtml(e) {
    return `<div class="etiqueta">
      <img src="${esc(ELO_QR.svg(e))}" alt="QR Code de ${esc(e.nome)}">
      <strong>${esc(e.nome)}</strong>
      <span>${esc(e.patrimonio || e.numero_patrimonio || "")}</span>
    </div>`;
  }

  let equipamentos;
  try {
    equipamentos = await ELO.equipamentos();
  } catch (erro) {
    folha.replaceChildren();
    resumo.textContent = "";
    mostrarAviso(erro.message || "Não foi possível carregar os equipamentos.", "error");
    botaoImprimir.disabled = true;
    return;
  }

  let lista;
  if (idsPedidos.length) {
    const pedidos = new Set(idsPedidos);
    lista = equipamentos.filter((e) => pedidos.has(String(e.id)));
    const faltando = idsPedidos.length - lista.length;
    if (faltando > 0) mostrarAviso(`${faltando} equipamento(s) selecionado(s) não foram encontrados e ficaram de fora.`, "info");
  } else {
    lista = equipamentos.filter((e) => e.status !== "baixado" && e.situacao !== "inativo");
  }
  lista.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR") || String(a.patrimonio).localeCompare(String(b.patrimonio), "pt-BR"));

  if (!lista.length) {
    folha.innerHTML = '<p class="estado-vazio no-print">Nenhum equipamento para imprimir.</p>';
    resumo.textContent = "0 etiquetas";
    botaoImprimir.disabled = true;
    return;
  }

  resumo.textContent = `${lista.length} ${lista.length === 1 ? "etiqueta" : "etiquetas"} · ${idsPedidos.length ? "equipamentos selecionados" : "todos os equipamentos que não foram baixados"}`;
  folha.innerHTML = lista.map(etiquetaHtml).join("");
  folha.querySelectorAll("img").forEach((img) => img.addEventListener("error", () => {
    img.replaceWith(Object.assign(document.createElement("span"), { className: "etiqueta-falha", textContent: "QR Code indisponível" }));
  }, { once: true }));

  // O endereço gravado no QR vem do backend (QR_CONSULTA_URL); etiqueta impressa não muda depois.
  const destinos = [...new Set(lista.map((e) => {
    try { return ELO_QR.destino(e) ? new URL(ELO_QR.destino(e)).origin : ""; } catch { return ""; }
  }).filter(Boolean))];
  const destino = $("etiquetas-destino");
  if (destinos.length) {
    destino.innerHTML = `Os QR Codes abrem <strong>${destinos.map(esc).join(", ")}</strong>. Confirme com a equipe que esse é o endereço definitivo antes de imprimir o acervo inteiro: a etiqueta impressa não muda depois.`;
    destino.hidden = false;
  }

  botaoImprimir.addEventListener("click", async () => {
    botaoImprimir.disabled = true;
    botaoImprimir.textContent = "Preparando…";
    await aguardarImagens();
    botaoImprimir.disabled = false;
    botaoImprimir.textContent = "Imprimir";
    window.print();
  });

  if (imprimirAoAbrir) {
    await aguardarImagens();
    window.print();
  }
})();
