(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const lista = $("solicitantes-lista");
  const busca = $("busca-solicitante");
  const aviso = $("solicitante-aviso");
  let solicitantes = [];

  const norm = (value) => String(value ?? "")
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const esc = EloUtil.esc;

  function mostrarAviso(texto, tipo = "error") {
    aviso.hidden = false;
    aviso.className = `alert alert-${tipo}`;
    aviso.textContent = texto;
  }

  function rotuloTipo(tipo) {
    const t = norm(tipo);
    if (t.includes("prof")) return "Professor";
    if (t.includes("serv") || t.includes("tecn")) return "Servidor";
    return "Aluno";
  }

  function render() {
    const termo = norm(busca.value.trim());
    const filtrados = solicitantes.filter((item) => {
      const texto = [item.nome, item.matricula, item.id, item.email, item.tipo].join(" ");
      return !termo || norm(texto).includes(termo);
    });

    if (!filtrados.length) {
      lista.innerHTML = `<div class="selector-empty"><strong>Nenhum usuário encontrado.</strong><span>Confira a busca ou cadastre um novo solicitante.</span></div>`;
      return;
    }

    lista.innerHTML = filtrados.map((item) => {
      const id = esc(item.id);
      const nome = esc(item.nome || "Nome não informado");
      const matricula = item.matricula ? `Matrícula ${esc(item.matricula)}` : "Sem matrícula informada";
      const tipo = esc(rotuloTipo(item.tipo));
      return `<article class="solicitante-choice">
        <div class="solicitante-avatar" aria-hidden="true">${esc(String(item.nome || "?").trim().charAt(0).toUpperCase() || "?")}</div>
        <div class="solicitante-choice-info">
          <strong>${nome}</strong>
          <span>${matricula}</span>
          <small>${tipo}${item.email ? ` · ${esc(item.email)}` : ""}</small>
        </div>
        <a class="btn btn-primary solicitante-choice-action" href="novo-emprestimo.html?solicitanteId=${encodeURIComponent(item.id)}${item.matricula ? `&matricula=${encodeURIComponent(item.matricula)}` : ""}">Selecionar</a>
      </article>`;
    }).join("");
  }

  busca.addEventListener("input", render);

  (async () => {
    try {
      const resposta = await ELO.solicitantes();
      solicitantes = (Array.isArray(resposta) ? resposta : []).filter((item) => item.ativo !== false);
      if (!solicitantes.length) {
        lista.innerHTML = `<div class="selector-empty"><strong>Nenhum solicitante ativo cadastrado.</strong><span>Cadastre ou reative um usuário antes de iniciar um empréstimo.</span></div>`;
        return;
      }
      render();
    } catch (error) {
      mostrarAviso(error.message || "Não foi possível carregar os usuários.", "error");
      lista.innerHTML = "";
    }
  })();
})();
