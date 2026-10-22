/* Utilitários visuais compartilhados. Os botões de operação são tratados
 * nas suas páginas próprias para evitar mensagens de sucesso sem gravação real.
 */
window.ELOAviso = function (texto, tipo = "info") {
  let el = document.getElementById("elo-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "elo-toast";
    el.setAttribute("role", "status");
    el.style.cssText = "position:fixed;right:1rem;bottom:1rem;z-index:100;padding:.85rem 1rem;border:1px solid var(--border,#29344D);border-radius:12px;background:var(--surface,#11182B);color:var(--text,#fff);box-shadow:0 12px 40px #0008;max-width:min(28rem,calc(100vw - 2rem))";
    document.body.appendChild(el);
  }
  el.dataset.tipo = tipo;
  el.textContent = texto;
};
