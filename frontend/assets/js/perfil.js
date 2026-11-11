/* Perfil: dados da própria conta, com edição de nome (e telefone para aluno/professor). */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nomesPapeis = { admin: "Administrador", administrador: "Administrador", operador: "Operador", aluno: "Aluno", professor: "Professor" };
  const msg = $("perfil-mensagem");
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const avisar = (texto, ok) => { msg.textContent = texto; msg.className = `alert ${ok ? "alert-ok" : "alert-error"}`; msg.hidden = false; };
  const iniciais = (nome) => nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toLocaleUpperCase("pt-BR") || "?";

  function preencher(p) {
    $("nome").value = p.nome || "";
    $("email").value = p.email || "";
    $("perfil").value = nomesPapeis[p.papel] || p.papel || "Não informado";
    const editaTelefone = (p.editaveis || []).includes("telefone");
    $("campo-telefone").hidden = !editaTelefone;
    $("telefone").value = p.telefone || "";
    $("campo-matricula").hidden = !p.matricula;
    $("matricula").value = p.matricula || "";
    if ($("profile-avatar")) $("profile-avatar").textContent = iniciais(p.nome || "");
  }

  let atual = null;
  ELO.perfil().then((p) => { atual = p; preencher(p); })
    .catch((e) => avisar(e.message || "Não foi possível carregar o perfil.", false));

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
      salvarSessao({ ...obterSessao(), nome: atual.nome });  // menu lateral com o nome novo
      avisar("Perfil atualizado com sucesso.", true);
    } catch (e) { avisar(e.message || "Não foi possível salvar.", false); }
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
  if (sessao?.master === true || sessao?.usuario?.master === true) zonaMaster.hidden = false;
  zerar?.addEventListener("click", async () => {
    const explicacao = "Esta operação apagará TODOS os equipamentos, reservas, empréstimos, manutenções e o histórico. Contas, solicitantes, categorias e solicitações de acesso serão preservados. Não há como desfazer.";
    if (!window.confirm(explicacao)) return;
    const confirmacao = window.prompt('Para confirmar, digite exatamente "ZERAR DADOS":', "");
    if (confirmacao !== "ZERAR DADOS") { if (confirmacao !== null) zerarMsg.textContent = "Confirmação incorreta. Nenhum dado foi apagado."; zerarMsg.className = "alert alert-error"; zerarMsg.hidden = false; return; }
    zerar.disabled = true;
    try {
      const resultado = await ELO.zerarDados(confirmacao);
      zerarMsg.textContent = `Operação concluída. Resumo: ${Object.entries(resultado?.apagados || resultado || {}).map(([chave, valor]) => `${chave}: ${valor}`).join(" · ") || "dados operacionais apagados"}.`;
      zerarMsg.className = "alert alert-ok"; zerarMsg.hidden = false;
    } catch (error) { zerarMsg.textContent = error.message || "Não foi possível zerar os dados."; zerarMsg.className = "alert alert-error"; zerarMsg.hidden = false; }
    finally { zerar.disabled = false; }
  });
})();
