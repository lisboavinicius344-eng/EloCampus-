/* Consulta pública de equipamentos. Detalhes de empréstimos e histórico só aparecem para equipe autenticada. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const video = $("qr-video"), reader = $("qr-reader"), hint = $("qr-reader-hint"), abrirCamera = $("abrir-camera"), arquivo = $("qr-arquivo");
  const form = $("consulta-form"), campo = $("codigo"), botao = $("consultar-btn"), status = $("consulta-status"), resultado = $("resultado"), permissao = $("qr-permission");
  const elementosObrigatorios = { video, reader, hint, abrirCamera, arquivo, form, campo, botao, status, resultado, permissao };
  const elementosAusentes = Object.entries(elementosObrigatorios)
    .filter(([, elemento]) => !elemento)
    .map(([nome]) => nome);
  if (elementosAusentes.length) {
    console.error("consulta-qr: elemento ausente", elementosAusentes);
    return;
  }

  let stream = null, timer = null, detector = null, lendo = false;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const valor = (o, ks) => ks.map(k => o?.[k]).find(v => v !== undefined && v !== null && String(v).trim() !== "");
  const msg = (texto, tipo = "info") => { permissao.textContent = texto; permissao.className = `qr-permission is-${tipo}`; };
  const situacaoTexto = (valorBruto) => ({
    disponivel: "Disponível", emprestado: "Emprestado", atrasado: "Em atraso", manutencao: "Em manutenção",
    inativo: "Inativo", baixado: "Inativo", cancelado: "Cancelado", concluido: "Concluído", em_andamento: "Em andamento",
    emprestimo: "Empréstimo", devolucao: "Devolução", baixa: "Baixa", manutencao_concluida: "Manutenção concluída", manutencao_cancelada: "Manutenção cancelada",
  }[String(valorBruto || "").toLowerCase()] || (valorBruto ? String(valorBruto).replace(/[_-]+/g, " ").replace(/^\p{L}/u, x => x.toLocaleUpperCase("pt-BR")) : "Não informado"));
  const formatarData = (v) => {
    if (!v) return "Não informado";
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? "Não informado" : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  };
  const campoDetalhe = (rotulo, conteudo) => conteudo !== undefined && conteudo !== null && String(conteudo).trim() !== ""
    ? `<div><dt>${esc(rotulo)}</dt><dd>${esc(conteudo)}</dd></div>` : "";
  const sessaoEquipe = () => {
    if (typeof obterSessao !== "function") return false;
    const s = obterSessao();
    const perfil = String(s?.perfil || s?.usuario?.papel || "").toLowerCase();
    return Boolean(s?.token) && ["admin", "administrador", "operador"].includes(perfil);
  };
  const sessaoUsuarioFinal = () => {
    const s = typeof obterSessao === "function" ? obterSessao() : null;
    return Boolean(s?.token) && ["aluno", "professor"].includes(String(s?.perfil || "").toLowerCase());
  };
  // Equipe logada: o item abre direto na página do equipamento dentro do sistema.
  const abrirItemNoSistema = (id, substituir = false) => {
    if (!sessaoEquipe() || id === undefined || id === null || String(id).trim() === "") return false;
    const destino = `equipamento-detalhe.html?id=${encodeURIComponent(id)}`;
    if (substituir) location.replace(destino); else location.assign(destino);
    return true;
  };
  let consultaPorId = false;
  const stop = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.srcObject = null; reader.classList.remove("is-active"); abrirCamera.textContent = "Abrir câmera"; lendo = false;
  };
  // Etiqueta nova: https://<site>/q/<id>. A consulta vai pelo ID e o campo mostra o patrimônio, não o link.
  const idDaEtiqueta = (texto) => (String(texto || "").trim().match(/\/q\/(\d+)\/?(?:[?#].*)?$/) || [])[1] || "";
  const entregarCodigo = (codigo) => {
    stop();
    const id = idDaEtiqueta(codigo);
    campo.value = id ? "" : codigo;
    consultar(id || codigo, Boolean(id));
  };
  const lerVideo = async () => {
    if (!lendo || video.readyState < 2) { if (lendo) timer = setTimeout(lerVideo, 250); return; }
    try {
      if (detector) {
        const codes = await detector.detect(video);
        if (codes[0]?.rawValue) return entregarCodigo(codes[0].rawValue);
      } else if (window.jsQR) {
        const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(video, 0, 0);
        const code = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data) return entregarCodigo(code.data);
      }
    } catch { /* continua tentando enquanto a câmera estiver ativa */ }
    timer = setTimeout(lerVideo, 220);
  };
  const iniciarCamera = async () => {
    if (lendo) return stop();
    if (!navigator.mediaDevices?.getUserMedia) return msg("Este navegador não oferece acesso à câmera. Use a galeria ou informe o identificador.", "error");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream; await video.play(); reader.classList.add("is-active"); abrirCamera.textContent = "Fechar câmera"; lendo = true;
      msg("Câmera ativa. Aponte para o QR Code.");
      if ("BarcodeDetector" in window) { try { detector = new BarcodeDetector({ formats: ["qr_code"] }); } catch { detector = null; } }
      lerVideo();
    } catch (e) {
      stop(); msg(e.name === "NotAllowedError" ? "Permissão para a câmera negada. Autorize o acesso ou use a galeria." : "Não foi possível abrir a câmera. Use a galeria ou informe o identificador.", "error");
    }
  };
  // Fotos de celular têm 12 MP ou mais: ler no tamanho original é lento e costuma falhar com etiqueta
  // pequena. Tenta o leitor nativo do navegador e depois o jsQR em algumas escalas.
  const decodificarImagem = async (img) => {
    if ("BarcodeDetector" in window) {
      try {
        const encontrados = await new BarcodeDetector({ formats: ["qr_code"] }).detect(img);
        if (encontrados[0]?.rawValue) return encontrados[0].rawValue;
      } catch { /* segue para o jsQR */ }
    }
    if (!window.jsQR) return null;
    const lado = Math.max(img.naturalWidth, img.naturalHeight) || 1;
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true });
    for (const maximo of [1000, 1600, 700, 2400, 450]) {
      const escala = Math.min(1, maximo / lado);
      canvas.width = Math.max(1, Math.round(img.naturalWidth * escala)); canvas.height = Math.max(1, Math.round(img.naturalHeight * escala));
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const code = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height, { inversionAttempts: "attemptBoth" });
      if (code?.data) return code.data;
      if (escala === 1 && maximo >= lado) break;
      await new Promise((ok) => setTimeout(ok, 0)); // deixa a tela responder entre as tentativas
    }
    return null;
  };
  const lerImagem = (file) => {
    if (!file) return;
    if (!("BarcodeDetector" in window) && !window.jsQR) { msg("A leitura da galeria não está disponível neste navegador. Use a câmera ou informe o identificador.", "error"); return; }
    msg("Lendo a imagem…");
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = async () => {
      try {
        const codigo = await decodificarImagem(img);
        if (codigo) { msg("QR Code encontrado na imagem.", "info"); entregarCodigo(codigo); }
        else msg("Não encontrei um QR Code nessa imagem. Tire a foto mais perto, com a etiqueta inteira e nítida, ou use a câmera.", "error");
      } finally { URL.revokeObjectURL(url); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); msg("Não foi possível abrir essa imagem. Tente outra imagem (JPG ou PNG).", "error"); };
    img.src = url;
  };

  const carregarHistoricoEquipe = async (equipamento, section) => {
    if (!sessaoEquipe() || typeof ELO.movimentacoes !== "function") return;
    try {
      const todos = await ELO.movimentacoes();
      const id = String(equipamento.id ?? "");
      const movimentos = (Array.isArray(todos) ? todos : []).filter(m => String(m.equipamento?.id ?? m.equipamento_id ?? "") === id)
        .sort((a, b) => new Date(b.quando || b.data_movimentacao || 0) - new Date(a.quando || a.data_movimentacao || 0)).slice(0, 8);
      const container = section.querySelector("[data-qr-history]");
      if (!container) return;
      if (!movimentos.length) {
        container.innerHTML = '<p class="qr-muted-note">Nenhuma movimentação consta no histórico da API para este equipamento.</p>';
        return;
      }
      container.innerHTML = `<ol class="qr-history-list">${movimentos.map(m => `<li><span class="qr-history-dot" aria-hidden="true"></span><div><strong>${esc(typeof EloUtil !== "undefined" && EloUtil.tipoMovimentacao ? EloUtil.tipoMovimentacao(m.tipo || m.tipo_movimentacao) : situacaoTexto(m.tipo || m.tipo_movimentacao))}</strong><p>${esc(m.detalhe || m.descricao || "Movimentação registrada")}</p><small>${esc(formatarData(m.quando || m.data_movimentacao))}${m.por || m.usuario_nome ? ` · ${esc(m.por || m.usuario_nome)}` : ""}</small></div></li>`).join("")}</ol>`;
    } catch {
      const container = section.querySelector("[data-qr-history]");
      if (container) container.innerHTML = '<p class="qr-muted-note">Não foi possível carregar o histórico agora. Os dados atuais do equipamento continuam disponíveis.</p>';
    }
  };

  const mostrarResultado = (dados) => {
    const e = dados?.equipamento || dados;
    const emprestimo = dados?.emprestimo || null;
    if (!e || typeof e !== "object" || !valor(e, ["id", "nome", "numero_patrimonio", "patrimonio", "qr_code"])) {
      throw new Error("A resposta não contém um equipamento reconhecido.");
    }
    const nome = valor(e, ["nome", "name"]) || "Equipamento sem nome";
    const patrimonio = valor(e, ["numero_patrimonio", "patrimonio", "numeroPatrimonio", "assetNumber"]);
    const rawState = valor(e, ["situacao", "status", "estado"]);
    const stateText = situacaoTexto(rawState);
    const stateKey = String(rawState || "desconhecido").toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const situacao = String(rawState || "").toLowerCase();
    const emprestado = ["emprestado", "atrasado"].includes(situacao) || Boolean(emprestimo);
    const condicao = situacaoTexto(valor(e, ["estado_conservacao", "condicao"]));
    if (patrimonio) campo.value = patrimonio; // o campo mostra o patrimônio, nunca o link da etiqueta
    consultaPorId = false;
    if (abrirItemNoSistema(e.id)) return;
    const reservavel = sessaoUsuarioFinal() && ["disponivel", "emprestado"].includes(situacao) && e.id !== undefined && e.id !== null;
    const reservarMarkup = reservavel ? `<p class="qr-reservar"><a class="btn btn-primary" href="reservas.html?equipamentos=${encodeURIComponent(e.id)}">Reservar este equipamento</a></p>` : "";
    const historicoMarkup = sessaoEquipe() ? '<section class="qr-history"><h3>Movimentações recentes</h3><div data-qr-history><p class="qr-muted-note">Carregando histórico…</p></div></section>' : "";
    const emprestimoMarkup = emprestimo ? `<section class="qr-loan-info"><div class="qr-section-title"><h3>Empréstimo atual</h3><span class="qr-state ${emprestimo.atrasado ? "is-late" : "is-loaned"}">${emprestimo.atrasado ? "Em atraso" : "Em andamento"}</span></div><dl>${campoDetalhe("Solicitante", emprestimo.solicitante)}${campoDetalhe("Retirada", formatarData(emprestimo.data_emprestimo))}${campoDetalhe("Devolução prevista", formatarData(emprestimo.data_prevista_devolucao))}</dl></section>` : (emprestado ? '<p class="qr-privacy-note">O equipamento está emprestado. Por privacidade, os detalhes do empréstimo só são exibidos para a equipe autorizada.</p>' : '<p class="qr-muted-note">A consulta não indica um empréstimo ativo neste momento. Para confirmar movimentações anteriores, consulte o histórico da equipe.</p>');
    resultado.innerHTML = `<div class="qr-result-title"><div><span class="qr-result-eyebrow">Consulta concluída</span><h2>${esc(nome)}</h2>${patrimonio ? `<p class="qr-result-patrimonio">Patrimônio ${esc(patrimonio)}</p>` : ""}</div><span class="qr-state state-${esc(stateKey)}">${esc(stateText)}</span></div><section class="qr-equipment-info"><h3>Informações do equipamento</h3><dl>${campoDetalhe("Categoria", e.categoria || e.categoria_nome)}${campoDetalhe("Setor", e.setor)}${campoDetalhe("Localização", e.localizacao)}${campoDetalhe("Conservação", condicao)}${campoDetalhe("Código QR", e.qr_code)}${campoDetalhe("Elegibilidade", e.elegibilidade === "somente_funcionarios" ? "Somente funcionários" : e.elegibilidade === "todos" ? "Todos os perfis elegíveis" : e.elegibilidade)}${campoDetalhe("Observações", e.observacoes)}${campoDetalhe("Cadastrado em", formatarData(e.criado_em))}</dl></section>${reservarMarkup}${emprestimoMarkup}${historicoMarkup}`;
    resultado.hidden = false;
    if (sessaoEquipe() && !historicoMarkup) return;
    if (sessaoEquipe()) carregarHistoricoEquipe(e, resultado);
  };
  const limpar = () => { status.className = "qr-status"; status.textContent = ""; resultado.hidden = true; resultado.replaceChildren(); };

  abrirCamera.addEventListener("click", iniciarCamera);
  arquivo.addEventListener("change", () => { stop(); lerImagem(arquivo.files[0]); arquivo.value = ""; });
  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const digitado = campo.value.trim(), id = idDaEtiqueta(digitado);
    if (id) campo.value = "";
    consultar(id || digitado, consultaPorId || Boolean(id));
  });
  async function consultar(codigo, porId = false) {
    limpar();
    if (!codigo) { msg("Informe o identificador ou leia um QR Code.", "error"); campo.focus(); return; }
    botao.disabled = true; botao.textContent = "Consultando…"; status.className = "qr-status is-info"; status.textContent = "Consultando equipamento…";
    try {
      const dados = await ELO.consultaQr(codigo, { porId });
      if (!dados || (typeof dados === "object" && !Object.keys(dados).length)) throw new Error("O servidor não retornou os dados do equipamento.");
      status.className = "qr-status"; status.textContent = ""; mostrarResultado(dados);
    } catch (e) {
      status.className = "qr-status is-error";
      status.textContent = e.message || "Não foi possível consultar este equipamento.";
    } finally { botao.disabled = false; botao.textContent = "Consultar"; }
  }
  campo.addEventListener("input", () => { consultaPorId = false; });
  // ?id=36 vem da etiqueta nova (/q/36): a equipe vai direto ao item; os demais veem o resumo.
  const p = new URLSearchParams(location.search), idInicial = (p.get("id") || "").trim();
  const inicial = (p.get("patrimonio") || p.get("codigo") || p.get("qr") || "").trim();
  if (/^\d+$/.test(idInicial)) {
    if (!abrirItemNoSistema(idInicial, true)) consultar(idInicial, true);
  } else if (inicial) { campo.value = inicial; consultar(inicial); }
  window.addEventListener("pagehide", stop);
})();
