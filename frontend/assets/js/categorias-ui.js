(() => {
  "use strict";
  const $ = (id) => document.getElementById(id),
    form = $("cat-form"),
    tb = $("cat-tbody"),
    av = $("cat-aviso"),
    esc = EloUtil.esc;
  function aviso(t, tipo = "info") {
    av.hidden = false;
    av.className = `alert alert-${tipo}`;
    av.textContent = t;
  }
  const setoresKey = "elo.setores.cadastrados";
  const lerSetores = () => { try { const v = JSON.parse(localStorage.getItem(setoresKey) || "[]"); return Array.isArray(v) ? [...new Set(v.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR")) : []; } catch { return []; } };
  const salvarSetores = (v) => { try { localStorage.setItem(setoresKey, JSON.stringify(v)); } catch { /* armazenamento opcional */ } };
  function limparSetor() { $("setor-id").value = ""; $("setor-nome").value = ""; $("setor-save").textContent = "Adicionar setor"; $("setor-cancel").hidden = true; }
  function carregarSetores() {
    const body = $("setor-tbody"); if (!body) return;
    const setores = lerSetores(); body.replaceChildren();
    if (!setores.length) { body.innerHTML = '<tr><td colspan="2">Nenhum setor cadastrado.</td></tr>'; return; }
    setores.forEach((nome) => {
      const tr = document.createElement("tr"); const td = document.createElement("td"); td.textContent = nome; tr.append(td);
      const acoes = document.createElement("td"); acoes.className = "api-actions";
      const editar = document.createElement("button"); editar.className = "btn btn-line"; editar.type = "button"; editar.textContent = "Editar"; editar.addEventListener("click", () => { $("setor-id").value = nome; $("setor-nome").value = nome; $("setor-save").textContent = "Salvar alterações"; $("setor-cancel").hidden = false; $("setor-nome").focus(); });
      const excluir = document.createElement("button"); excluir.className = "btn btn-ghost"; excluir.type = "button"; excluir.textContent = "Excluir"; excluir.addEventListener("click", () => { if (!confirm(`Remover a sugestão de setor “${nome}”?`)) return; salvarSetores(lerSetores().filter((v) => v !== nome)); carregarSetores(); });
      acoes.append(editar, excluir); tr.append(acoes); body.append(tr);
    });
  }
  function limpar() {
    form.reset();
    $("cat-id").value = "";
    $("cat-form-title").textContent = "Nova categoria";
    $("cat-save").textContent = "Cadastrar categoria";
    $("cat-cancel").hidden = true;
  }
  async function carregar() {
    try {
      const list = [...await ELO.categorias()];
      const ordem = $("cat-ordem")?.value || "nome-asc";
      const dataCategoria = (c) => new Date(c.updated_at || c.atualizado_em || c.created_at || c.criado_em || 0).getTime() || 0;
      list.sort((a, b) => ordem === "recentes" ? dataCategoria(b) - dataCategoria(a) : ordem === "antigas" ? dataCategoria(a) - dataCategoria(b) : String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" }) * (ordem === "nome-desc" ? -1 : 1));
      const mostrarIds = EloUtil.podeVerIdsInternos();
      document.querySelectorAll("[data-id-column]").forEach((el) => { el.hidden = !mostrarIds; });
      tb.replaceChildren();
      if (!list.length) {
        tb.innerHTML = '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';
        return;
      }
      list.forEach((c) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `${mostrarIds ? `<td><span class="api-code">#${esc(c.id)}</span></td>` : ""}<td>${esc(c.nome)}</td><td>${esc(c.descricao || "—")}</td><td>${c.ativo === false ? "Inativa" : "Ativa"}</td><td><div class="api-actions"></div></td>`;
        const actions = tr.querySelector(".api-actions"),
          b = document.createElement("button");
        b.className = "btn btn-line";
        b.textContent = "Editar";
        b.addEventListener("click", () => {
          $("cat-id").value = c.id;
          $("cat-nome").value = c.nome || "";
          $("cat-desc").value = c.descricao || "";
          $("cat-form-title").textContent = `Editar categoria #${c.id}`;
          $("cat-save").textContent = "Salvar alterações";
          $("cat-cancel").hidden = false;
          form.scrollIntoView({
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start",
          });
        });
        actions.append(b);
        if (c.ativo !== false) {
          const d = document.createElement("button");
          d.className = "btn btn-ghost";
          d.textContent = "Desativar";
          d.addEventListener("click", async () => {
            if (!confirm(`Desativar a categoria “${c.nome}”?`)) return;
            d.disabled = true;
            try {
              const r = await ELO.desativarCategoria(c.id);
              aviso(r?.mensagem || "Categoria desativada.", "ok");
              await carregar();
            } catch (e) {
              aviso(e.message, "error");
              d.disabled = false;
            }
          });
          actions.append(d);
          const x = document.createElement("button");
          x.className = "btn btn-ghost";
          x.textContent = "Excluir";
          x.addEventListener("click", async () => {
            if (!confirm(`Excluir definitivamente a categoria “${c.nome}”? Esta ação não poderá ser desfeita.`)) return;
            x.disabled = true;
            try {
              const resposta = await ELO.excluirCategoria(c.id);
              aviso(resposta?.mensagem || "Categoria excluída.", "ok");
              await carregar();
            } catch (e) {
              aviso(e.message || "Não foi possível excluir a categoria. Se ela estiver vinculada a equipamentos, desative-a.", "error");
              x.disabled = false;
            }
          });
          actions.append(x);
        } else {
          const r = document.createElement("button");
          r.className = "btn btn-primary";
          r.textContent = "Reativar";
          r.addEventListener("click", async () => {
            if (!confirm(`Reativar a categoria “${c.nome}”?`)) return;
            r.disabled = true;
            try {
              const resposta = await ELO.reativarCategoria(c.id);
              aviso(resposta?.mensagem || "Categoria reativada.", "ok");
              await carregar();
            } catch (e) {
              aviso(e.message || "Não foi possível reativar a categoria.", "error");
              r.disabled = false;
            }
          });
          actions.append(r);
          const x = document.createElement("button");
          x.className = "btn btn-ghost";
          x.textContent = "Excluir";
          x.addEventListener("click", async () => {
            if (!confirm(`Excluir definitivamente a categoria “${c.nome}”? Esta ação não poderá ser desfeita.`)) return;
            x.disabled = true;
            try {
              const resposta = await ELO.excluirCategoria(c.id);
              aviso(resposta?.mensagem || "Categoria excluída.", "ok");
              await carregar();
            } catch (e) {
              aviso(e.message || "Não foi possível excluir a categoria. Se ela estiver vinculada a equipamentos, mantenha-a inativa.", "error");
              x.disabled = false;
            }
          });
          actions.append(x);
        }
        tb.append(tr);
      });
    } catch (e) {
      tb.innerHTML = `<tr><td colspan="5">${esc(e.message || "Não foi possível carregar categorias.")}</td></tr>`;
    }
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("cat-id").value,
      d = { nome: $("cat-nome").value.trim(), descricao: $("cat-desc").value.trim() };
    if (!d.nome) return aviso("Informe o nome da categoria.", "error");
    try {
      const r = id ? await ELO.editarCategoria(id, d) : await ELO.criarCategoria(d);
      aviso(r?.mensagem || (id ? "Categoria atualizada." : "Categoria criada."), "ok");
      limpar();
      carregar();
    } catch (err) {
      aviso(err.message, "error");
    }
  });
  $("cat-cancel").addEventListener("click", limpar);
  $("cat-refresh").addEventListener("click", carregar);
  $("cat-ordem")?.addEventListener("change", carregar);
  $("setor-form")?.addEventListener("submit", (event) => {
    event.preventDefault(); const nome = $("setor-nome").value.trim(); if (!nome) return aviso("Informe o nome do setor.", "error");
    const anterior = $("setor-id").value; const setores = lerSetores().filter((v) => v !== anterior);
    if (setores.some((v) => v.toLocaleLowerCase("pt-BR") === nome.toLocaleLowerCase("pt-BR"))) return aviso("Esse setor já está cadastrado.", "error");
    setores.push(nome); salvarSetores(setores); limparSetor(); carregarSetores(); aviso("Setor salvo.", "ok");
  });
  $("setor-cancel")?.addEventListener("click", limparSetor);
  carregar();
  carregarSetores();
})();
