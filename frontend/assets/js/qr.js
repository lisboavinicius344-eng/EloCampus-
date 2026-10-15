/* Leitura de QR por câmera/galeria. Nenhum dado de equipamento é inventado no front-end. */
(() => {
  const $ = (id) => document.getElementById(id);
  const video = $("qr-video"), reader = $("qr-reader"), hint = $("qr-reader-hint"), abrirCamera = $("abrir-camera"), arquivo = $("qr-arquivo");
  const form = $("consulta-form"), campo = $("codigo"), botao = $("consultar-btn"), status = $("consulta-status"), resultado = $("resultado"), permissao = $("qr-permission");
  let stream = null, timer = null, detector = null, lendo = false;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const valor = (o, ks) => ks.map(k => o?.[k]).find(v => v !== undefined && v !== null && v !== "");
  const msg = (texto, tipo = "info") => { permissao.textContent = texto; permissao.className = `qr-permission is-${tipo}`; };
  const stop = () => { if (timer) { clearTimeout(timer); timer = null; } if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } video.srcObject = null; reader.classList.remove("is-active"); abrirCamera.textContent = "Abrir câmera"; lendo = false; };
  const entregarCodigo = (codigo) => { stop(); campo.value = codigo; form.requestSubmit(); };
  const lerVideo = async () => {
    if (!lendo || video.readyState < 2) { if (lendo) timer = setTimeout(lerVideo, 250); return; }
    try {
      if (detector) { const codes = await detector.detect(video); if (codes[0]?.rawValue) return entregarCodigo(codes[0].rawValue); }
      else if (window.jsQR) { const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(video, 0, 0); const code = window.jsQR(canvas.width ? ctx.getImageData(0, 0, canvas.width, canvas.height).data : [], canvas.width, canvas.height); if (code?.data) return entregarCodigo(code.data); }
    } catch { /* a câmera continua tentando até encontrar um código */ }
    timer = setTimeout(lerVideo, 220);
  };
  const iniciarCamera = async () => {
    if (lendo) return stop();
    if (!navigator.mediaDevices?.getUserMedia) return msg("Este navegador não oferece acesso à câmera. Use a galeria ou informe o identificador.", "error");
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      video.srcObject = stream; await video.play(); reader.classList.add("is-active"); abrirCamera.textContent = "Fechar câmera"; lendo = true; msg("Câmera ativa. Aponte para o QR Code.");
      if ("BarcodeDetector" in window) { try { detector = new BarcodeDetector({ formats: ["qr_code"] }); } catch { detector = null; } }
      lerVideo();
    } catch (e) { stop(); msg(e.name === "NotAllowedError" ? "Permissão para a câmera negada. Autorize o acesso ou use a galeria." : "Não foi possível abrir a câmera. Use a galeria ou informe o identificador.", "error"); }
  };
  const lerImagem = (file) => {
    if (!file) return;
    const img = new Image(); img.onload = () => {
      const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; const ctx = canvas.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      const concluir = (data) => data ? entregarCodigo(data) : msg("Não encontrei um QR Code nessa imagem. Escolha outra imagem ou use a câmera.", "error");
      if (window.jsQR) { const code = window.jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height); concluir(code?.data); } else { msg("A leitura da galeria não está disponível neste navegador. Use a câmera ou informe o identificador.", "error"); }
      URL.revokeObjectURL(img.src);
    }; img.src = URL.createObjectURL(file);
  };
  const mostrarResultado = (dados) => { const e = dados?.equipamento || dados; const nome = valor(e, ["nome", "name"]), situacao = valor(e, ["situacao", "status", "estado"]), patrimonio = valor(e, ["patrimonio", "assetNumber", "numeroPatrimonio"]), local = valor(e, ["setor", "localizacao", "local"]); resultado.innerHTML = `<h2>Equipamento localizado</h2><dl>${nome ? `<div><dt>Equipamento</dt><dd>${esc(nome)}</dd></div>` : ""}${patrimonio ? `<div><dt>Patrimônio</dt><dd>${esc(patrimonio)}</dd></div>` : ""}${situacao ? `<div><dt>Situação</dt><dd>${esc(situacao)}</dd></div>` : ""}${local ? `<div><dt>Localização</dt><dd>${esc(local)}</dd></div>` : ""}</dl>`; resultado.hidden = false; };
  const limpar = () => { status.className = "qr-status"; status.textContent = ""; resultado.hidden = true; resultado.replaceChildren(); };
  abrirCamera.addEventListener("click", iniciarCamera); arquivo.addEventListener("change", () => { stop(); lerImagem(arquivo.files[0]); arquivo.value = ""; });
  form.addEventListener("submit", async (ev) => { ev.preventDefault(); limpar(); const codigo = campo.value.trim(); if (!codigo) { msg("Informe o identificador ou leia um QR Code.", "error"); campo.focus(); return; } botao.disabled = true; botao.textContent = "Consultando…"; status.className = "qr-status is-info"; status.textContent = "Consultando equipamento…"; try { const dados = await ELO.consultaQr(codigo); if (!dados || (typeof dados === "object" && !Object.keys(dados).length)) throw new Error("O servidor não retornou os dados do equipamento."); status.className = "qr-status"; status.textContent = ""; mostrarResultado(dados); } catch (e) { msg(e.message || "Não foi possível consultar este equipamento.", "error"); } finally { botao.disabled = false; botao.textContent = "Consultar"; } });
  const p = new URLSearchParams(location.search), inicial = (p.get("codigo") || p.get("qr") || p.get("id") || "").trim(); if (inicial) { campo.value = inicial; form.requestSubmit(); }
  window.addEventListener("pagehide", stop);
})();
