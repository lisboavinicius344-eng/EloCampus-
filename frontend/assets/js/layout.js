/* ELO Campus — layout compartilhado das páginas internas
 * Requer auth.js carregado antes. Monta o menu lateral e a barra superior
 * para que o HTML não seja repetido em cada página.
 * Cada página define <body data-pagina="painel"> para marcar o item ativo.
 */

const EloUtil = {
  SITUACOES: {
    disponivel: { rotulo: "Disponível",    cls: "ok" },
    emprestado: { rotulo: "Emprestado",    cls: "loan" },
    atrasado:   { rotulo: "Atrasado",      cls: "late" },
    manutencao: { rotulo: "Em manutenção", cls: "maint" },
    inativo:    { rotulo: "Inativo",       cls: "off" },
  },

  esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),

  data: (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),

  dataHora(d) {
    const h = new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${this.data(d)} · ${h}`;
  },

  // Dias de atraso por data de calendário: um empréstimo com devolução
  // prevista para hoje só passa a atrasado no dia seguinte.
  diasAtraso(prevista) {
    const a = new Date(prevista);
    const h = new Date();
    a.setHours(0, 0, 0, 0);
    h.setHours(0, 0, 0, 0);
    return Math.round((h - a) / 86400000);
  },

  prazo(prevista) {
    const d = this.diasAtraso(prevista);
    if (d > 0) return { classe: "late", texto: `Atrasado há ${d} ${d === 1 ? "dia" : "dias"}` };
    if (d === 0) return { classe: "maint", texto: "Vence hoje" };
    return { classe: "ok", texto: "Em dia" };
  },
};

(function () {
  const sessao = obterSessao();
  if (!sessao) { window.location.replace("../index.html"); return; }

  const ICONES = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    out: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9"/>',
  };
  const svg = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;

  // Sem href = ainda não implementado (aparece desabilitado).
  const NAV = [
    { id: "painel", rotulo: "Painel", icone: "home", href: "dashboard.html" },
    { id: "equipamentos", rotulo: "Equipamentos", icone: "box", href: "equipamentos.html" },
    { id: "emprestimos", rotulo: "Empréstimos", icone: "swap" },
    { id: "devolucoes", rotulo: "Devoluções", icone: "undo" },
    { id: "solicitantes", rotulo: "Solicitantes", icone: "users" },
    { id: "relatorios", rotulo: "Relatórios", icone: "chart" },
    // Ocultar o item não protege nada: o back-end também precisa validar o perfil.
    { id: "usuarios", rotulo: "Usuários", icone: "shield", admin: true },
  ];

  const atual = document.body.dataset.pagina;
  const itens = NAV.filter((i) => !i.admin || sessao.perfil === "administrador").map((i) => {
    if (!i.href) {
      return `<li><span class="nav-item is-disabled" aria-disabled="true">${svg(i.icone)}<span>${i.rotulo}</span><small>Em breve</small></span></li>`;
    }
    const ativo = i.id === atual;
    return `<li><a class="nav-item${ativo ? " is-active" : ""}" href="${i.href}"${ativo ? ' aria-current="page"' : ""}>${svg(i.icone)}<span>${i.rotulo}</span></a></li>`;
  }).join("");

  const nome = EloUtil.esc(sessao.nome || "Usuário");
  const iniciais = (sessao.nome || "U").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const perfil = sessao.perfil ? sessao.perfil[0].toUpperCase() + sessao.perfil.slice(1) : "";

  document.getElementById("sidebar").innerHTML = `
    <a class="side-brand" href="dashboard.html">
      <img src="../assets/img/logo.svg" alt="">
      <span>ELO Campus<small>IF Baiano · Lapa</small></span>
    </a>
    <nav aria-label="Principal"><ul class="nav">${itens}</ul></nav>
    <div class="user">
      <span class="avatar" aria-hidden="true">${EloUtil.esc(iniciais)}</span>
      <div class="user-info"><strong>${nome}</strong><small>${EloUtil.esc(perfil)}</small></div>
      <button class="user-out" type="button" id="btn-sair" aria-label="Sair do sistema" title="Sair">${svg("out")}</button>
    </div>`;

  document.getElementById("topbar").innerHTML = `
    <button class="topbar-btn" type="button" id="btn-menu" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir menu">${svg("menu")}</button>
    <span class="topbar-brand"><img src="../assets/img/logo.svg" alt="">ELO Campus</span>`;

  const scrim = document.createElement("div");
  scrim.className = "scrim";
  document.body.appendChild(scrim);

  const lateral = document.getElementById("sidebar");
  const btnMenu = document.getElementById("btn-menu");
  const alternar = (abrir) => {
    lateral.classList.toggle("is-open", abrir);
    scrim.classList.toggle("is-open", abrir);
    btnMenu.setAttribute("aria-expanded", String(abrir));
  };

  btnMenu.addEventListener("click", () => alternar(!lateral.classList.contains("is-open")));
  scrim.addEventListener("click", () => alternar(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });
  document.getElementById("btn-sair").addEventListener("click", sair);
})();
/* ELO Campus — layout compartilhado das páginas internas
 * Requer util.js e auth.js carregados antes. Monta o menu lateral e a barra superior
 * para que o HTML não seja repetido em cada página.
 * Cada página define <body data-pagina="painel"> para marcar o item ativo.
 */


(function () {
  const sessao = obterSessao();
  if (!sessao) { window.location.replace("../index.html"); return; }

  const ICONES = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    out: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9"/>',
  };
  const svg = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;

  // Sem href = ainda não implementado (aparece desabilitado).
  const NAV = [
    { id: "painel", rotulo: "Painel", icone: "home", href: "dashboard.html" },
    { id: "equipamentos", rotulo: "Equipamentos", icone: "box", href: "equipamentos.html" },
    { id: "emprestimos", rotulo: "Empréstimos", icone: "swap" },
    { id: "devolucoes", rotulo: "Devoluções", icone: "undo" },
    { id: "solicitantes", rotulo: "Solicitantes", icone: "users" },
    { id: "relatorios", rotulo: "Relatórios", icone: "chart" },
    // Ocultar o item não protege nada: o back-end também precisa validar o perfil.
    { id: "usuarios", rotulo: "Usuários", icone: "shield", admin: true },
  ];

  const atual = document.body.dataset.pagina;
  const itens = NAV.filter((i) => !i.admin || sessao.perfil === "administrador").map((i) => {
    if (!i.href) {
      return `<li><span class="nav-item is-disabled" aria-disabled="true">${svg(i.icone)}<span>${i.rotulo}</span><small>Em breve</small></span></li>`;
    }
    const ativo = i.id === atual;
    return `<li><a class="nav-item${ativo ? " is-active" : ""}" href="${i.href}"${ativo ? ' aria-current="page"' : ""}>${svg(i.icone)}<span>${i.rotulo}</span></a></li>`;
  }).join("");

  const nome = EloUtil.esc(sessao.nome || "Usuário");
  const iniciais = (sessao.nome || "U").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const perfil = sessao.perfil ? sessao.perfil[0].toUpperCase() + sessao.perfil.slice(1) : "";

  document.getElementById("sidebar").innerHTML = `
    <a class="side-brand" href="dashboard.html">
      <img src="../assets/img/logo.svg" alt="">
      <span>ELO Campus<small>IF Baiano · Lapa</small></span>
    </a>
    <nav aria-label="Principal"><ul class="nav">${itens}</ul></nav>
    <div class="user">
      <span class="avatar" aria-hidden="true">${EloUtil.esc(iniciais)}</span>
      <div class="user-info"><strong>${nome}</strong><small>${EloUtil.esc(perfil)}</small></div>
      <button class="user-out" type="button" id="btn-sair" aria-label="Sair do sistema" title="Sair">${svg("out")}</button>
    </div>`;

  document.getElementById("topbar").innerHTML = `
    <button class="topbar-btn" type="button" id="btn-menu" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir menu">${svg("menu")}</button>
    <span class="topbar-brand"><img src="../assets/img/logo.svg" alt="">ELO Campus</span>`;

  const scrim = document.createElement("div");
  scrim.className = "scrim";
  document.body.appendChild(scrim);

  const lateral = document.getElementById("sidebar");
  const btnMenu = document.getElementById("btn-menu");
  const alternar = (abrir) => {
    lateral.classList.toggle("is-open", abrir);
    scrim.classList.toggle("is-open", abrir);
    btnMenu.setAttribute("aria-expanded", String(abrir));
  };

  btnMenu.addEventListener("click", () => alternar(!lateral.classList.contains("is-open")));
  scrim.addEventListener("click", () => alternar(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") alternar(false); });
  document.getElementById("btn-sair").addEventListener("click", sair);
})();