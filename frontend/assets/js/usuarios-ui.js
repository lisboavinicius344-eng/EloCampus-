(() => {
  const rows = [...document.querySelectorAll("tbody tr")];
  const detail = document.querySelector('[aria-label="Usuário selecionado"]');
  const toast = (text) => {
    let el = document.getElementById("elo-toast");
    if (!el) { el = document.createElement("div"); el.id = "elo-toast"; el.style = "position:fixed;right:1rem;bottom:1rem;z-index:100;padding:.85rem 1rem;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);box-shadow:0 12px 40px #0008"; document.body.append(el); }
    el.textContent = text; el.hidden = false; clearTimeout(el._timer); el._timer = setTimeout(() => { el.hidden = true; }, 2600);
  };
  const filter = (query) => rows.forEach((row) => { row.hidden = Boolean(query && !row.innerText.toLowerCase().includes(query)); });
  document.getElementById("busca")?.addEventListener("input", (event) => filter(event.target.value.toLowerCase()));
  document.querySelectorAll(".tabs .tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".tabs .tab").forEach((item) => item.setAttribute("aria-selected", "false"));
    tab.setAttribute("aria-selected", "true");
    const type = tab.innerText.split("·")[0].trim().toLowerCase();
    filter(type === "todos" ? "" : type === "administradores" ? "administrador" : type === "estagiários" ? "estagiário" : "consulta");
  }));
  rows.forEach((row) => row.querySelector("button")?.addEventListener("click", () => {
    rows.forEach((item) => item.classList.remove("is-selected")); row.classList.add("is-selected");
    const cells = row.querySelectorAll("td"); const parts = (cells[0]?.innerText || "").split("\n");
    if (!detail) return;
    detail.querySelector("h2").textContent = parts[0] || "Usuário";
    const subtitle = detail.querySelector("h2 + div");
    if (subtitle) subtitle.textContent = parts[1] || "";
    toast(`Usuário ${parts[0] || "selecionado"} selecionado.`);
  }));
  document.querySelectorAll("button").forEach((button) => {
    if (button.textContent.includes("Salvar alterações")) button.addEventListener("click", () => { if (confirm("Salvar as permissões deste usuário?")) toast("Permissões salvas."); });
    if (button.textContent.includes("Redefinir senha")) button.addEventListener("click", () => { if (confirm("Enviar um link de redefinição de senha?")) toast("Link de redefinição preparado."); });
    if (button.textContent.includes("Novo usuário")) button.addEventListener("click", () => { const name = prompt("Nome do novo usuário:"); if (name?.trim()) toast(`${name.trim()} aguardando cadastro completo.`); });
  });
})();
