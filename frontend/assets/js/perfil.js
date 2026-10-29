/* Perfil: exibição dos dados devolvidos pela autenticação. Edição depende de rota de API. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const usuario = sessao?.usuario || sessao || {};
  const nome = usuario.nome || sessao?.nome || "";
  const email = usuario.email || sessao?.email || "";
  const papel = String(sessao?.perfil || usuario.papel || "").toLowerCase();
  const nomesPapeis = { administrador: "Administrador", admin: "Administrador", operador: "Operador", aluno: "Aluno", professor: "Professor" };
  if ($("nome")) $("nome").value = nome;
  if ($("email")) $("email").value = email;
  if ($("perfil")) $("perfil").value = nomesPapeis[papel] || papel || "Não informado";
  if ($("profile-avatar")) {
    const iniciais = nome.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("pt-BR");
    $("profile-avatar").textContent = iniciais || "?";
  }
  $("perfil-sair")?.addEventListener("click", () => {
    if (confirm("Deseja sair da conta?")) sair();
  });
})();
