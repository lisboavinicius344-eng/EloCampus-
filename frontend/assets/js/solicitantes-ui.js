(() => {
  const rows = [...document.querySelectorAll("tbody tr")];
  const detail = document.querySelector('[aria-label="Detalhe do solicitante"]');
  function toast(text) {
    let el = document.getElementById("elo-toast");
    if (!el) { el = document.createElement("div"); el.id = "elo-toast"; el.style = "position:fixed;right:1rem;bottom:1rem;z-index:100;padding:.85rem 1rem;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);box-shadow:0 12px 40px #0008"; document.body.append(el); }
    el.textContent = text; el.hidden = false; clearTimeout(el._timer); el._timer = setTimeout(() => { el.hidden = true; }, 2600);
  }
  function filtrar(texto = "") { rows.forEach((row) => { row.hidden = Boolean(texto && !row.innerText.toLowerCase().includes(texto)); }); }
  document.getElementById("busca")?.addEventListener("input", (event) => filtrar(event.target.value.toLowerCase()));
  document.querySelectorAll(".tabs .tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".tabs .tab").forEach((item) => item.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    const tipo = tab.innerText.split("·")[0].trim().toLowerCase();
    filtrar(tipo === "todos" ? "" : tipo === "alunos" ? "alun" : tipo === "professores" ? "professor" : tipo === "servidores" ? "servidor" : "");
  }));
  rows.forEach((row) => row.querySelector("button")?.addEventListener("click", () => {
    rows.forEach((item) => item.classList.remove("is-selected")); row.classList.add("is-selected");
    const cells = row.querySelectorAll("td"); if (!detail) return;
    const parts = (cells[0]?.innerText || "Solicitante").split("\n");
    const nome = parts[0] || "Solicitante"; const vinculo = cells[1]?.innerText || "Vínculo"; const matricula = parts[1] || "";
    detail.querySelector("h2").textContent = nome; const sub = detail.querySelector("h2 + div"); if (sub) sub.textContent = `${vinculo} · ${matricula}`;
    toast(`Exibindo detalhes de ${nome}.`);
  }));
  document.querySelectorAll("button").forEach((button) => {
    if (button.innerText.includes("Novo solicitante")) button.addEventListener("click", () => {
      const nome = window.prompt("Nome completo do novo solicitante:"); if (!nome?.trim()) return;
      const vinculo = window.prompt("Vínculo (Aluno, Professor ou Servidor):", "Aluno") || "Aluno"; const tbody = document.querySelector("tbody"); if (!tbody) return;
      const row = document.createElement("tr"); row.innerHTML = `<td><strong>${nome.trim()}</strong><small>Cadastro local</small></td><td>${vinculo}</td><td>0</td><td><span class="pill pill-ok">Regular</span></td><td><button class="btn btn-sm btn-line" type="button">Ver</button></td>`; tbody.append(row); toast("Solicitante adicionado.");
    });
    if (button.innerText.includes("Editar cadastro")) button.addEventListener("click", () => {
      const atual = detail?.querySelector("h2")?.textContent || "Solicitante"; const novo = window.prompt("Nome do solicitante:", atual);
      if (novo?.trim() && detail) { detail.querySelector("h2").textContent = novo.trim(); toast("Cadastro atualizado."); }
    });
  });
})();
