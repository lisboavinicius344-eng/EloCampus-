/* Consulta pública de equipamentos. Detalhes de empréstimos e histórico só aparecem para equipe autenticada. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const video = $("qr-video"), reader = $("qr-reader"), hint = $("qr-reader-hint"), abrirCamera = $("abrir-camera"), arquivo = $("qr-arquivo");
  const form = $("consulta-form"), campo = $("codigo"), botao = $("consultar-btn"), status = $("consulta-status"), resultado = $("resultado"), permissao = $("qr-permission");
  if (![video, reader, abrirCamera, arquivo, form, campo, botao, status, resultado, permissao].every(Boolean)) return;

  let stream = null, timer = null, detector = null, lendo = false;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const valor = (o, ks) => ks.map(k => o?.[k]).find(v => v !== undefined && v !== null && String(v).trim() !== "");
  const msg = (texto, tipo = "info") => { permissao.textContent = texto; permissao.className = `qr-permission is-${tipo}`; };
  const situacaoTexto = (valorBruto) => ({
    disponivel: "Disponível", emprestado: "Emprestado", atrasado: "Em atraso", manutencao: "Em manutenção",
    inativo: "Inativo", baixado: "Inativo", cancelado: "Cancelado", concluido: "Concluído", em_andamento: "Em andamento",
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
  const stop = () => {
    if (timer) { clearTimeout(timer); timer = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    video.srcObject = null; reader.classList.remove("is-active"); abrirCamera.textContent = "Abrir câmera"; lendo = false;
  };
  const entregarCodigo = (codigo) => { stop(); campo.value = codigo; form.requestSubmit(); };
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
  const lerImagem = (file) => {
    if (!file) return;
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      if (window.jsQR) {
        const code = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
        if (code?.data) entregarCodigo(code.data); else msg("Não encontrei um QR Code nessa imagem. Escolha outra imagem ou use a câmera.", "error");
      } else msg("A leitura da galeria não está disponível neste navegador. Use a câmera ou informe o identificador.", "error");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => { URL.revokeObjectURL(url); msg("Não foi possível abrir essa imagem. Tente outra imagem.", "error"); };
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
      container.innerHTML = `<ol class="qr-history-list">${movimentos.map(m => `<li><span class="qr-history-dot" aria-hidden="true"></span><div><strong>${esc(situacaoTexto(m.tipo || m.tipo_movimentacao))}</strong><p>${esc(m.detalhe || m.descricao || "Movimentação registrada")}</p><small>${esc(formatarData(m.quando || m.data_movimentacao))}${m.por || m.usuario_nome ? ` · ${esc(m.por || m.usuario_nome)}` : ""}</small></div></li>`).join("")}</ol>`;
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
    const historicoMarkup = sessaoEquipe() ? '<section class="qr-history"><h3>Movimentações recentes</h3><div data-qr-history><p class="qr-muted-note">Carregando histórico…</p></div></section>' : "";
    const emprestimoMarkup = emprestimo ? `<section class="qr-loan-info"><div class="qr-section-title"><h3>Empréstimo atual</h3><span class="qr-state ${emprestimo.atrasado ? "is-late" : "is-loaned"}">${emprestimo.atrasado ? "Em atraso" : "Em andamento"}</span></div><dl>${campoDetalhe("Solicitante", emprestimo.solicitante)}${campoDetalhe("Retirada", formatarData(emprestimo.data_emprestimo))}${campoDetalhe("Devolução prevista", formatarData(emprestimo.data_prevista_devolucao))}</dl></section>` : (emprestado ? '<p class="qr-privacy-note">O equipamento está emprestado. Por privacidade, os detalhes do empréstimo só são exibidos para a equipe autorizada.</p>' : '<p class="qr-muted-note">A consulta não indica um empréstimo ativo neste momento. Para confirmar movimentações anteriores, consulte o histórico da equipe.</p>');
    resultado.innerHTML = `<div class="qr-result-title"><div><span class="qr-result-eyebrow">Consulta concluída</span><h2>${esc(nome)}</h2>${patrimonio ? `<p class="qr-result-patrimonio">Patrimônio ${esc(patrimonio)}</p>` : ""}</div><span class="qr-state state-${esc(stateKey)}">${esc(stateText)}</span></div><section class="qr-equipment-info"><h3>Informações do equipamento</h3><dl>${campoDetalhe("ID do sistema", e.id)}${campoDetalhe("Categoria", e.categoria || e.categoria_nome)}${campoDetalhe("Setor", e.setor)}${campoDetalhe("Localização", e.localizacao)}${campoDetalhe("Conservação", condicao)}${campoDetalhe("Código QR", e.qr_code)}${campoDetalhe("Elegibilidade", e.elegibilidade === "somente_funcionarios" ? "Somente funcionários" : e.elegibilidade === "todos" ? "Todos os perfis elegíveis" : e.elegibilidade)}${campoDetalhe("Observações", e.observacoes)}${campoDetalhe("Cadastrado em", formatarData(e.criado_em))}</dl></section>${emprestimoMarkup}${historicoMarkup}`;
    resultado.hidden = false;
    if (sessaoEquipe() && !historicoMarkup) return;
    if (sessaoEquipe()) carregarHistoricoEquipe(e, resultado);
  };
  const limpar = () => { status.className = "qr-status"; status.textContent = ""; resultado.hidden = true; resultado.replaceChildren(); };

  abrirCamera.addEventListener("click", iniciarCamera);
  arquivo.addEventListener("change", () => { stop(); lerImagem(arquivo.files[0]); arquivo.value = ""; });
  form.addEventListener("submit", async (ev) => {
    ev.preventDefault(); limpar();
    const codigo = campo.value.trim();
    if (!codigo) { msg("Informe o identificador ou leia um QR Code.", "error"); campo.focus(); return; }
    botao.disabled = true; botao.textContent = "Consultando…"; status.className = "qr-status is-info"; status.textContent = "Consultando equipamento…";
    try {
      const dados = await ELO.consultaQr(codigo);
      if (!dados || (typeof dados === "object" && !Object.keys(dados).length)) throw new Error("O servidor não retornou os dados do equipamento.");
      status.className = "qr-status"; status.textContent = ""; mostrarResultado(dados);
    } catch (e) { msg(e.message || "Não foi possível consultar este equipamento.", "error"); }
    finally { botao.disabled = false; botao.textContent = "Consultar"; }
  });
  const p = new URLSearchParams(location.search), inicial = (p.get("codigo") || p.get("patrimonio") || p.get("qr") || p.get("id") || "").trim();
  if (inicial) { campo.value = inicial; form.requestSubmit(); }
  window.addEventListener("pagehide", stop);
})();
