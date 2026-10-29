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
  function limpar() {
    form.reset();
    $("cat-id").value = "";
    $("cat-form-title").textContent = "Nova categoria";
    $("cat-save").textContent = "Cadastrar categoria";
    $("cat-cancel").hidden = true;
  }
  async function carregar() {
    try {
      const list = await ELO.categorias();
      tb.replaceChildren();
      if (!list.length) {
        tb.innerHTML = '<tr><td colspan="5">Nenhuma categoria cadastrada.</td></tr>';
        return;
      }
      list.forEach((c) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td><span class="api-code">#${esc(c.id)}</span></td><td>${esc(c.nome)}</td><td>${esc(c.descricao || "—")}</td><td>${c.ativo === false ? "Inativa" : "Ativa"}</td><td><div class="api-actions"></div></td>`;
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
            try {
              const r = await ELO.desativarCategoria(c.id);
              aviso(r?.mensagem || "Categoria desativada.", "ok");
              carregar();
            } catch (e) {
              aviso(e.message, "error");
            }
          });
          actions.append(d);
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
  carregar();
})();
