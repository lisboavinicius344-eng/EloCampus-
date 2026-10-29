/* Perfil: dados da própria conta, com edição de nome (e telefone para aluno/professor). */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const nomesPapeis = { admin: "Administrador", operador: "Operador", aluno: "Aluno", professor: "Professor" };
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

  $("perfil-sair")?.addEventListener("click", () => { if (confirm("Deseja sair da conta?")) sair(); });
})();
