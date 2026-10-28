(() => {
  const $ = (id) => document.getElementById(id);
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const usuario = sessao?.usuario || sessao || {};
  const nome = String(usuario.nome || sessao?.nome || "").trim() || "Usuário";
  const email = String(usuario.email || sessao?.email || sessao?.login || "").trim() || "Não informado";
  const perfil = String(sessao?.perfil || usuario.papel || usuario.perfil || "").toLowerCase();
  const papeis = {
    administrador: "Administrador / TI",
    admin: "Administrador / TI",
    operador: "Equipe operacional",
    aluno: "Discente",
    professor: "Docente",
  };
  const iniciais = nome.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase();

  $("profile-avatar").textContent = iniciais || "?";
  $("perfil-nome-titulo").textContent = nome;
  $("perfil-email-sub").textContent = email;
  $("perfil-nome").textContent = nome;
  $("perfil-email").textContent = email;
  $("perfil-papel").textContent = papeis[perfil] || "Não informado";
  $("perfil-id").textContent = String(usuario.id ?? sessao?.id ?? "—");
  const solicitanteId = usuario.solicitante_id ?? sessao?.solicitante_id;
  if (solicitanteId !== undefined && solicitanteId !== null && String(solicitanteId).trim() !== "") {
    $("perfil-solicitante").textContent = String(solicitanteId);
    $("perfil-solicitante-row").hidden = false;
  }

  const sairPerfil = $("perfil-sair");
  if (sairPerfil) sairPerfil.addEventListener("click", () => {
    if (confirm("Deseja sair da conta?")) sair();
  });
})();
