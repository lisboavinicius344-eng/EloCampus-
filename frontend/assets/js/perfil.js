/* Perfil: dados da própria conta, com edição de nome (e telefone para aluno/professor). */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nomesPapeis = { admin: "Administrador", administrador: "Administrador", operador: "Operador", aluno: "Aluno", professor: "Professor" };
  const msg = $("perfil-mensagem");
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
  ELO.perfil().then((p) => {
    atual = p;
    preencher(p);
    const sessao = obterSessao();
    if (sessao && sessao.master !== (p.master === true)) salvarSessao({ ...sessao, master: p.master === true });
    const zona = $("zona-master");
    if (zona) zona.hidden = p.master !== true;
  })
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
      salvarSessao({ ...obterSessao(), nome: atual.nome, master: atual.master === true });  // mantém nome e permissão atualizados
      avisar("Perfil atualizado com sucesso.", true);
    } catch (e) { avisar(e.message || "Não foi possível salvar.", false); }
    finally { botao.disabled = false; botao.textContent = "Salvar alterações"; }
  });

  $("perfil-alterar-senha")?.addEventListener("click", (evento) => {
    const confirmado = window.confirm("Deseja continuar para a página de alteração de senha? Você poderá informar sua senha atual e definir uma nova senha.");
    if (!confirmado) evento.preventDefault();
  });

  $("perfil-sair")?.addEventListener("click", () => { if (confirm("Deseja sair da conta?")) sair(); });
  // Zona master: só aparece quando a sessão indica master === true (o backend continua sendo a autoridade).
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
