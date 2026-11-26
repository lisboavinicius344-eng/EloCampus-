/* Perfil: dados da própria conta, com edição de nome, telefone e foto quando a API suportar. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nomesPapeis = { admin: "Administrador", administrador: "Administrador", operador: "Operador", aluno: "Aluno", professor: "Professor" };
  const msg = $("perfil-mensagem");
  const avisar = (texto, ok) => { msg.textContent = texto; msg.className = `alert ${ok ? "alert-ok" : "alert-error"}`; msg.hidden = false; };
  const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toLocaleUpperCase("pt-BR") || "?";
  let atual = null;
  let fotoPendente = null;

  const suportaFoto = (perfil) => Object.prototype.hasOwnProperty.call(perfil || {}, "foto") || (Array.isArray(perfil?.editaveis) && perfil.editaveis.some((campo) => ["foto", "avatar", "foto_url", "avatar_url"].includes(String(campo).toLowerCase())));

  function preencher(p) {
    $("nome").value = p.nome || "";
    $("email").value = p.email || "";
    $("perfil").value = nomesPapeis[p.papel] || p.papel || "Não informado";
    const editaTelefone = (p.editaveis || []).includes("telefone");
    $("campo-telefone").hidden = !editaTelefone;
    $("telefone").value = p.telefone || "";
    $("campo-matricula").hidden = !p.matricula;
    $("matricula").value = p.matricula || "";
    const avatar = $("profile-avatar");
    if (avatar) {
      avatar.classList.toggle("has-photo", Boolean(p.foto));
      avatar.innerHTML = p.foto ? `<img src="${EloUtil.esc(p.foto)}" alt="Foto de ${EloUtil.esc(p.nome || "usuário")}">` : EloUtil.esc(iniciais(p.nome || ""));
    }
    const foto = $("profile-photo");
    const ajuda = $("profile-photo-help");
    const habilitada = suportaFoto(p);
    if (foto) foto.disabled = !habilitada;
    if (ajuda) ajuda.textContent = habilitada ? "PNG, JPG ou WEBP. Escolha uma imagem e salve as alterações." : "A API atual ainda não disponibiliza edição persistente de foto para este perfil.";
  }

  ELO.perfil().then((p) => {
    atual = p;
    preencher(p);
    const sessao = obterSessao();
    if (sessao && sessao.master !== (p.master === true)) salvarSessao({ ...sessao, master: p.master === true });
    const zona = $("zona-master");
    if (zona) zona.hidden = p.master !== true;
  }).catch((e) => avisar(e.message || "Não foi possível carregar o perfil.", false));

  $("profile-photo")?.addEventListener("change", (event) => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) { avisar("Escolha um arquivo de imagem.", false); event.target.value = ""; return; }
    if (arquivo.size > 2 * 1024 * 1024) { avisar("A foto deve ter no máximo 2 MB.", false); event.target.value = ""; return; }
    const leitor = new FileReader();
    leitor.onload = () => { fotoPendente = String(leitor.result || ""); preencher({ ...atual, foto: fotoPendente }); };
    leitor.readAsDataURL(arquivo);
  });

  $("perfil-salvar")?.addEventListener("click", async () => {
    if (!atual) return;
    const dados = {};
    const nome = $("nome").value.trim();
    if (!nome) { avisar("Informe o nome.", false); $("nome").focus(); return; }
    if (nome !== atual.nome) dados.nome = nome;
    if (!$("campo-telefone").hidden && $("telefone").value.trim() !== (atual.telefone || "")) dados.telefone = $("telefone").value.trim();
    if (fotoPendente) {
      if (!suportaFoto(atual)) { avisar("A API atual não permite salvar foto de perfil.", false); return; }
      dados.foto = fotoPendente;
    }
    if (!Object.keys(dados).length) { avisar("Nenhuma alteração para salvar.", true); return; }
    const botao = $("perfil-salvar"); botao.disabled = true; botao.textContent = "Salvando…";
    try {
      atual = await ELO.salvarPerfil(dados);
      fotoPendente = null;
      preencher(atual);
      salvarSessao({ ...obterSessao(), nome: atual.nome, foto: atual.foto || undefined, master: atual.master === true });
      avisar("Perfil atualizado com sucesso.", true);
    } catch (e) { avisar(e.message || "Não foi possível salvar.", false); }
    finally { botao.disabled = false; botao.textContent = "Salvar alterações"; }
  });

  $("perfil-alterar-senha")?.addEventListener("click", (evento) => { if (!window.confirm("Deseja continuar para a página de alteração de senha? Você poderá informar sua senha atual e definir uma nova senha.")) evento.preventDefault(); });
  $("perfil-sair")?.addEventListener("click", () => { if (confirm("Deseja sair da conta?")) sair(); });
  const zonaMaster = $("zona-master"), zerar = $("zerar-dados"), zerarMsg = $("zerar-dados-mensagem");
  const ehMaster = () => { const s = obterSessao(); return s?.master === true || s?.usuario?.master === true; };
  const mostrarZerar = (texto, ok) => { zerarMsg.textContent = texto; zerarMsg.className = `alert ${ok ? "alert-ok" : "alert-error"}`; zerarMsg.hidden = false; };
  if (zonaMaster && ehMaster()) zonaMaster.hidden = false;
  zerar?.addEventListener("click", async () => {
    if (!ehMaster()) return;
    if (!window.confirm("Esta operação apagará TODOS os equipamentos, reservas, empréstimos, manutenções e o histórico. Contas, solicitantes, categorias e solicitações de acesso serão preservados. Não há como desfazer.")) return;
    const confirmacao = window.prompt('Para confirmar, digite exatamente "ZERAR DADOS":', "");
    if (confirmacao === null) return;
    if (confirmacao !== "ZERAR DADOS") { mostrarZerar("Confirmação incorreta. Nenhum dado foi apagado.", false); return; }
    zerar.disabled = true;
    try { const resultado = await ELO.zerarDados(confirmacao); const resumo = Object.entries(resultado?.apagados || {}).map(([chave, valor]) => `${chave}: ${valor}`).join(" · "); mostrarZerar(resultado?.mensagem || `Operação concluída.${resumo ? ` Resumo: ${resumo}.` : ""}`, true); }
    catch (error) { mostrarZerar(error.message || "Não foi possível zerar os dados.", false); }
    finally { zerar.disabled = false; }
  });
})();
