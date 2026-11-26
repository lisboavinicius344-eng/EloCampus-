/* Perfil: dados da própria conta e imagem local da conta. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nomesPapeis = { admin: "Administrador", administrador: "Administrador", operador: "Operador", aluno: "Aluno", professor: "Professor" };
  const msg = $("perfil-mensagem");
  const erroFoto = $("perfil-foto-erro");
  const avisar = (texto, ok) => { msg.textContent = texto; msg.className = `alert ${ok ? "alert-ok" : "alert-error"}`; msg.hidden = false; };
  const avisarFoto = (texto = "") => { erroFoto.textContent = texto; erroFoto.hidden = !texto; };
  const MAX_INPUT_BYTES = 1024 * 1024;
  const MAX_OUTPUT_BYTES = 360 * 1024;
  const TIPOS_IMAGEM = new Set(["image/jpeg", "image/png", "image/webp"]);
  let atual = null;
  let sessaoAtual = obterSessao() || {};

  function imagemSegura(valor) {
    return /^(data:image\/(?:jpeg|png|webp);base64,|https:\/\/)/i.test(String(valor || "")) ? String(valor) : "";
  }

  function iniciais(nome) {
    return (String(nome || "U").trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("") || "U").toUpperCase();
  }

  function atualizarAvatarCompartilhado(url) {
    const avatar = document.querySelector(".avatar-link");
    if (!avatar) return;
    avatar.innerHTML = url
      ? `<img src="${EloUtil.esc(url)}" alt="" class="avatar-image">`
      : EloUtil.esc(iniciais(atual?.nome || sessaoAtual.nome));
  }

  function mostrarFoto(url) {
    const imagem = $("perfil-foto-imagem");
    const letras = $("perfil-foto-iniciais");
    const remover = $("perfil-foto-remover");
    const segura = imagemSegura(url);
    if (segura) {
      imagem.src = segura;
      imagem.hidden = false;
      letras.hidden = true;
      remover.hidden = false;
    } else {
      imagem.removeAttribute("src");
      imagem.hidden = true;
      letras.textContent = iniciais(atual?.nome || sessaoAtual.nome);
      letras.hidden = false;
      remover.hidden = true;
    }
    atualizarAvatarCompartilhado(segura);
  }

  function fotoSalvaLocal() {
    return EloUtil.avatarLocal({ ...sessaoAtual, ...atual });
  }

  function salvarFotoLocal(url) {
    try {
      const chave = EloUtil.avatarStorageKey({ ...sessaoAtual, ...atual });
      if (url) localStorage.setItem(chave, url);
      else localStorage.removeItem(chave);
    } catch (_) {
      throw new Error("Não foi possível guardar a imagem neste navegador.");
    }
  }

  function lerArquivo(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => resolve(String(leitor.result || ""));
      leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      leitor.readAsDataURL(arquivo);
    });
  }

  async function prepararImagem(arquivo) {
    if (!arquivo || !TIPOS_IMAGEM.has(arquivo.type)) throw new Error("Escolha uma imagem JPG, PNG ou WEBP.");
    if (arquivo.size > MAX_INPUT_BYTES) throw new Error("A imagem deve ter no máximo 1 MB.");
    const original = await lerArquivo(arquivo);
    const imagem = new Image();
    imagem.src = original;
    await new Promise((resolve, reject) => {
      imagem.onload = resolve;
      imagem.onerror = () => reject(new Error("A imagem selecionada não pôde ser processada."));
    });
    const escala = Math.min(1, 512 / Math.max(imagem.naturalWidth || imagem.width, imagem.naturalHeight || imagem.height));
    const largura = Math.max(1, Math.round((imagem.naturalWidth || imagem.width) * escala));
    const altura = Math.max(1, Math.round((imagem.naturalHeight || imagem.height) * escala));
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    canvas.getContext("2d").drawImage(imagem, 0, 0, largura, altura);
    for (const qualidade of [0.84, 0.72, 0.6, 0.5]) {
      const resultado = canvas.toDataURL("image/webp", qualidade);
      if (resultado.length <= MAX_OUTPUT_BYTES || qualidade === 0.5) return resultado;
    }
    return canvas.toDataURL("image/jpeg", 0.5);
  }

  function preencher(p) {
    $("nome").value = p.nome || "";
    $("email").value = p.email || "";
    $("perfil").value = nomesPapeis[p.papel] || p.papel || "Não informado";
    const editaTelefone = (p.editaveis || []).includes("telefone");
    $("campo-telefone").hidden = !editaTelefone;
    $("telefone").value = p.telefone || "";
    $("campo-matricula").hidden = !p.matricula;
    $("matricula").value = p.matricula || "";
  }

  ELO.perfil().then((p) => {
    atual = p;
    preencher(p);
    const sessao = obterSessao();
    sessaoAtual = sessao || {};
    if (sessao && sessao.master !== (p.master === true)) salvarSessao({ ...sessao, master: p.master === true });
    const zona = $("zona-master");
    if (zona) zona.hidden = p.master !== true;
    const fotoDaApi = imagemSegura(p.avatar || p.avatar_url || p.foto_perfil || p.imagem || p.foto);
    mostrarFoto(fotoSalvaLocal() || fotoDaApi);
  })
    .catch((e) => avisar(e.message || "Não foi possível carregar o perfil.", false));

  $("perfil-foto")?.addEventListener("change", async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    avisarFoto("");
    try {
      const foto = await prepararImagem(arquivo);
      salvarFotoLocal(foto);
      mostrarFoto(foto);
      avisar("Imagem do perfil atualizada neste navegador.", true);
    } catch (e) {
      evento.target.value = "";
      avisarFoto(e.message || "Não foi possível usar essa imagem.");
    }
  });

  $("perfil-foto-remover")?.addEventListener("click", () => {
    try {
      salvarFotoLocal("");
      $("perfil-foto").value = "";
      mostrarFoto("");
      avisar("Imagem do perfil removida.", true);
    } catch (e) { avisarFoto(e.message); }
  });

  $("perfil-salvar")?.addEventListener("click", async () => {
    if (!atual) return;
    const dados = {};
    const nome = $("nome").value.trim();
    if (!nome) { avisar("Informe o nome.", false); $("nome").focus(); return; }
    if (nome !== atual.nome) dados.nome = nome;
    if (!$("campo-telefone").hidden && $("telefone").value.trim() !== (atual.telefone || "")) dados.telefone = $("telefone").value.trim();
    if (!Object.keys(dados).length) { avisar("Nenhuma alteração para salvar.", true); return; }
    const botao = $("perfil-salvar"); botao.disabled = true; botao.textContent = "Salvando…";
    try {
      atual = await ELO.salvarPerfil(dados);
      preencher(atual);
      salvarSessao({ ...obterSessao(), nome: atual.nome, master: atual.master === true });
      sessaoAtual = obterSessao() || sessaoAtual;
      mostrarFoto(fotoSalvaLocal());
      avisar("Perfil atualizado com sucesso.", true);
    } catch (e) { avisar(e.message || "Não foi possível salvar as alterações.", false); }
    finally { botao.disabled = false; botao.textContent = "Salvar alterações"; }
  });

  $("perfil-alterar-senha")?.addEventListener("click", (evento) => {
    const confirmado = window.confirm("Deseja continuar para a página de alteração de senha? Você poderá informar sua senha atual e definir uma nova senha.");
    if (!confirmado) evento.preventDefault();
  });

  $("perfil-sair")?.addEventListener("click", () => { if (confirm("Deseja sair da conta?")) sair(); });
  const zonaMaster = $("zona-master");
  const zerar = $("zerar-dados");
  const zerarMsg = $("zerar-dados-mensagem");
  const ehMaster = () => { const s = obterSessao(); return s?.master === true || s?.usuario?.master === true; };
  const mostrarZerar = (texto, ok) => { zerarMsg.textContent = texto; zerarMsg.className = `alert ${ok ? "alert-ok" : "alert-error"}`; zerarMsg.hidden = false; };
  if (zonaMaster && ehMaster()) zonaMaster.hidden = false;
  zerar?.addEventListener("click", async () => {
    if (!ehMaster()) return;
    const explicacao = "Esta operação apagará TODOS os equipamentos, reservas, empréstimos, manutenções e o histórico. Contas, solicitantes, categorias e solicitações de acesso serão preservados. Não há como desfazer.";
    if (!window.confirm(explicacao)) return;
    const confirmacao = window.prompt('Para confirmar, digite exatamente "ZERAR DADOS":', "");
    if (confirmacao === null) return;
    if (confirmacao !== "ZERAR DADOS") { mostrarZerar("Confirmação incorreta. Nenhum dado foi apagado.", false); return; }
    zerar.disabled = true;
    try {
      const resultado = await ELO.zerarDados(confirmacao);
      const resumo = Object.entries(resultado?.apagados || {}).map(([chave, valor]) => `${chave}: ${valor}`).join(" · ");
      mostrarZerar(resultado?.mensagem || `Operação concluída.${resumo ? ` Resumo: ${resumo}.` : ""}`, true);
    } catch (error) {
      mostrarZerar(error.message || "Não foi possível zerar os dados.", false);
    } finally { zerar.disabled = false; }
  });
})();
