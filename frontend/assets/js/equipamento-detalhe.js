/* ELO Campus — detalhe do equipamento
 * equipamento-detalhe.html?id=12
 * Mostra informações, situação atual, histórico e o QR Code da etiqueta. */

(async function () {
  const $ = (id) => document.getElementById(id);
  const { esc, data, dataHora, prazo, SITUACOES } = EloUtil;

  const id = new URLSearchParams(window.location.search).get("id");

  function mostrarErro(msg) {
    const erro = $("erro");
    erro.innerHTML = `${esc(msg)} <a class="btn btn-ghost btn-sm" href="equipamentos.html">Voltar para a lista</a>`;
    erro.hidden = false;
  }

  if (!id) { mostrarErro("Nenhum equipamento foi indicado. Abra um item pela lista de equipamentos."); return; }

  let eq, movs;
  try {
    [eq, movs] = await Promise.all([ELO.equipamento(id), ELO.movimentacoesEquipamento(id)]);
  } catch (err) {
    mostrarErro(err.message);
    return;
  }

  /* ---------- Cabeçalho e informações ---------- */
  const sit = SITUACOES[eq.situacao] || { rotulo: eq.situacao, cls: "off" };
  document.title = `${eq.nome} — ELO Campus`;
  $("nome").textContent = eq.nome;
  $("patrimonio").textContent = `Patrimônio ${eq.patrimonio}`;
  $("situacao-badge").innerHTML = `<span class="badge badge-${sit.cls}">${sit.rotulo}</span>`;
  $("link-editar").href = `equipamento-form.html?id=${encodeURIComponent(eq.id)}`;

  const cond = String(eq.condicao).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  $("info").innerHTML = `
    <div><dt>Número de patrimônio</dt><dd>${esc(eq.patrimonio)}</dd></div>
    <div><dt>Tipo</dt><dd>${esc(eq.categoria)}</dd></div>
    <div><dt>Setor responsável</dt><dd>${esc(eq.setor)}</dd></div>
    <div><dt>Condição física</dt><dd><span class="cond cond-${esc(cond)}">${esc(eq.condicao)}</span></dd></div>
    ${eq.observacoes ? `<div class="col-2"><dt>Observações</dt><dd>${esc(eq.observacoes)}</dd></div>` : ""}`;

  /* ---------- Situação atual ---------- */
  const a = eq.emprestimoAtual;
  if (a) {
    const p = prazo(a.prevista);
    $("atual").innerHTML = `
      <p><strong>Com ${esc(a.solicitante)}</strong> desde ${data(a.retirada)}.</p>
      <p>Devolução prevista para ${data(a.prevista)}. <span class="badge badge-${p.classe}">${p.texto}</span></p>`;
  } else {
    const textos = {
      disponivel: "Disponível para empréstimo.",
      manutencao: "Em manutenção. Fica indisponível até a regularização.",
      inativo: "Inativo. Não pode ser emprestado.",
    };
    $("atual").innerHTML = `<p>${textos[eq.situacao] || sit.rotulo}</p>`;
  }

  /* ---------- Histórico ---------- */
  $("historico").innerHTML = movs.length
    ? `<ul class="movs">${movs.map((m) => `
        <li class="mov mov-${esc(m.classe)}">
          <span class="mov-ponto" aria-hidden="true"></span>
          <div>
            <strong>${esc(m.tipo)}</strong>
            <small>${m.detalhe ? esc(m.detalhe) + " · " : ""}${dataHora(m.quando)} · por ${esc(m.por)}</small>
          </div>
        </li>`).join("")}</ul>`
    : '<p class="estado-vazio">Este equipamento ainda não tem movimentações registradas.</p>';

  /* ---------- QR Code ---------- */
  const base = (typeof URL_CONSULTA_BASE === "string" && URL_CONSULTA_BASE)
    ? URL_CONSULTA_BASE.replace(/\/$/, "")
    : new URL(".", window.location.href).href.replace(/\/$/, "");
  const urlQr = `${base}/consulta-qr.html?patrimonio=${encodeURIComponent(eq.patrimonio)}`;

  const qr = qrcode(0, "M");
  qr.addData(urlQr);
  qr.make();
  // margem de 4 módulos = zona de silêncio exigida para leitura confiável
  const svg = qr.createSvgTag({ cellSize: 4, margin: 16, scalable: true });

  $("qr").innerHTML = svg;
  $("etiqueta-pat").textContent = `PATRIMÔNIO: ${eq.patrimonio}`;
  $("qr-url").textContent = urlQr;

  const local = ["localhost", "127.0.0.1", "", "[::1]"].includes(window.location.hostname) || window.location.protocol === "file:";
  if (!URL_CONSULTA_BASE && local) $("aviso-url").hidden = false;

  $("imprimir").addEventListener("click", () => window.print());

  $("baixar").addEventListener("click", () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qr-${eq.patrimonio}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  });

  $("conteudo").hidden = false;
})();