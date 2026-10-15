(() => {
  const $ = (id) => document.getElementById(id), sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const form = $("perfil-form"), erro = $("erro"), sucesso = $("sucesso"), salvar = $("salvar");
  const campos = { nome: $("nome"), email: $("email"), telefone: $("telefone"), perfil: $("perfil"), notificacoes: $("notificacoes") };
  const iniciais = (nome) => (nome || "?").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const preencher = (dados = {}) => { campos.nome.value = dados.nome ?? sessao?.nome ?? ""; campos.email.value = dados.email ?? ""; campos.telefone.value = dados.telefone ?? ""; campos.perfil.value = dados.perfil ?? sessao?.perfil ?? ""; campos.notificacoes.checked = Boolean(dados.notificacoes); $("profile-avatar").textContent = iniciais(campos.nome.value); };
  const mostrar = (el, texto) => { el.textContent = texto; el.hidden = false; };
  (async () => { try { preencher(await ELO.perfil()); } catch { preencher(); } })();
  form.addEventListener("submit", async (ev) => { ev.preventDefault(); erro.hidden = true; sucesso.hidden = true; if (!campos.nome.value.trim()) { mostrar(erro, "Informe o nome de exibição."); campos.nome.focus(); return; } salvar.disabled = true; salvar.textContent = "Salvando…"; try { const dados = { nome: campos.nome.value.trim(), email: campos.email.value.trim(), telefone: campos.telefone.value.trim(), notificacoes: campos.notificacoes.checked }; const retorno = await ELO.salvarPerfil(dados); if (retorno?.nome || retorno?.perfil) { const atual = obterSessao() || {}; salvarSessao({ ...atual, ...retorno }); } else { const atual = obterSessao() || {}; salvarSessao({ ...atual, nome: dados.nome }); } preencher(retorno || dados); mostrar(sucesso, "Perfil atualizado."); } catch (e) { mostrar(erro, e.message || "Não foi possível salvar o perfil."); } finally { salvar.disabled = false; salvar.textContent = "Salvar alterações"; } });
})();
