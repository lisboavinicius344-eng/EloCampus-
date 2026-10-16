/* ELO Campus — layout compartilhado das páginas internas
 * Requer auth.js carregado antes. Monta o menu lateral e a barra superior
 * para que o HTML não seja repetido em cada página.
 * Cada página define <body data-pagina="painel"> para marcar o item ativo.
 */

const EloUtil = {
  esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),

  data: (d) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),

  dataHora(d) {
    const h = new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return `${EloUtil.data(d)} · ${h}`;
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
    const d = EloUtil.diasAtraso(prevista);
    if (d > 0) return { classe: "late", texto: `Atrasado há ${d} ${d === 1 ? "dia" : "dias"}` };
    if (d === 0) return { classe: "maint", texto: "Vence hoje" };
    return { classe: "ok", texto: "Em dia" };
  },
};

(function () {
  let sessao = obterSessao();
  const publico = document.body.dataset.publico === "true";
  if (!sessao && !publico) { window.location.replace("../index.html"); return; }
  if (!sessao) sessao = { nome: "Consulta pública", perfil: "visitante" };

  const ICONES = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    gear: '<path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="m19.4 15 .1.1-1.7 1.7-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8v.2h-2.4v-.2a2 2 0 0 0-1.2-1.8 2 2 0 0 0-2.2.4l-.1.1-1.7-1.7.1-.1a2 2 0 0 0 .4-2.2 2 2 0 0 0-1.8-1.2h-.2v-2.4h.2a2 2 0 0 0 1.8-1.2 2 2 0 0 0-.4-2.2l-.1-.1 1.7-1.7.1.1a2 2 0 0 0 2.2.4 2 2 0 0 0 1.2-1.8v-.2h2.4v.2a2 2 0 0 0 1.2 1.8 2 2 0 0 0 2.2-.4l.1-.1 1.7 1.7-.1.1a2 2 0 0 0-.4 2.2 2 2 0 0 0 1.8 1.2h.2v2.4h-.2a2 2 0 0 0-1.8 1.2 2 2 0 0 0 .4 2.2Z"/>',
    server: '<rect x="4" y="4" width="16" height="6" rx="1"/><rect x="4" y="14" width="16" height="6" rx="1"/><path d="M8 7h.01M8 17h.01"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M16 11a3 3 0 1 0 0-6M18 20a5 5 0 0 0-2-4"/>',
    'people-admin': '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 14l1 2 2 .3-1.5 1.5.3 2.1-1.8-1-1.8 1 .3-2.1-1.5-1.5 2-.3z"/>', 
    settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m4.9 9.2-1.4-1 .0-2 1.6-.9 1.7.7 1-1.4L7.2 3h2l.9 1.6 1.9-.1L13 3h2l.1 1.7 1.8.8 1.7-.7 1.4 1.4-.7 1.7.9 1.7 1.7.1v2l-1.7.9-.8 1.8.7 1.7-1.4 1.4-1.7-.7-1.7.9-.1 1.7h-2l-.9-1.7-1.8-.8-1.7.7-1.4-1.4.7-1.7-.9-1.7-1.7-.1v-2l1.7-.9.8-1.8Z"/>', 
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    out: '<path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4M16 17l5-5-5-5M21 12H9"/>',
  };
  const svg = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;

  // Sem href = ainda não implementado (aparece desabilitado).
  const NAV = [
    { id: "painel", rotulo: "Painel", icone: "home", href: "dashboard.html" },
    { grupo: "Acervo", itens: [
      { id: "equipamentos", rotulo: "Equipamentos", icone: "box", href: "equipamentos.html" },
      { id: "consulta-qr", rotulo: "Consulta por QR Code", icone: "box", href: "consulta-qr-interno.html" },
      { id: "movimentacoes", rotulo: "Histórico de movimentações", icone: "swap", href: "movimentacoes.html" },
    ]},
    { grupo: "Empréstimos e devoluções", itens: [
      { id: "emprestimos", rotulo: "Empréstimos", icone: "swap", href: "emprestimos.html" },
      { id: "devolucoes", rotulo: "Devoluções", icone: "undo", href: "devolucoes.html" },
    ]},
    { grupo: "Administração", itens: [
      { id: "solicitantes", rotulo: "Solicitantes", icone: "people", href: "solicitantes.html" },
      { id: "relatorios", rotulo: "Relatórios", icone: "chart", href: "relatorio.html" },
      { id: "servidor", rotulo: "Servidor", icone: "server", href: "servidor.html" },
      { id: "usuarios", rotulo: "Usuários", icone: "people-admin", href: "usuarios.html", admin: true },
    ]},
    { id: "perfil", rotulo: "Configuração do perfil", icone: "gear", href: "perfil.html" },
  ];

  const atual = document.body.dataset.pagina;
  const itemHtml = (i) => {
    if (i.admin && sessao.perfil !== "administrador") return "";
    const ativo = i.id === atual;
    const icon = svg(i.icone);
    return `<li><a class="nav-item${ativo ? " is-active" : ""}" href="${i.href}"${ativo ? ' aria-current="page"' : ""}>${icon}<span>${i.rotulo}</span></a></li>`;
  };
  const itens = NAV.map((item) => {
    if (!item.grupo) return itemHtml(item);
    const visiveis = item.itens.filter((i) => !i.admin || sessao.perfil === "administrador");
    if (!visiveis.length) return "";
    const aberto = visiveis.some((i) => i.id === atual);
    return `<li class="nav-section"><details${aberto ? " open" : ""}><summary><span>${item.grupo}</span><b aria-hidden="true">›</b></summary><ul>${visiveis.map(itemHtml).join("")}</ul></details></li>`;
  }).join("");

  const nome = EloUtil.esc(sessao.nome || "Usuário");
  const iniciais = (sessao.nome || "U").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const perfil = sessao.perfil ? sessao.perfil[0].toUpperCase() + sessao.perfil.slice(1) : "";

  document.getElementById("sidebar").innerHTML = `
    <a class="side-brand" href="dashboard.html">
      <img src="../assets/img/logo.png" alt="">
      <span>ELO Campus<small>Instituição - Campus Lapa</small></span>
    </a>
    <nav aria-label="Principal"><ul class="nav">${itens}</ul></nav>
    <div class="user">
      <a class="avatar avatar-link${sessao.foto ? " has-photo" : ""}" href="perfil.html" aria-label="Abrir configuração do perfil">${sessao.foto ? `<img src="${EloUtil.esc(sessao.foto)}" alt="Foto de ${nome}">` : EloUtil.esc(iniciais)}</a>
      <div class="user-info"><strong>${nome}</strong><small>${EloUtil.esc(perfil)}</small></div>
      <button class="user-out" type="button" id="btn-sair" aria-label="Sair do sistema" title="Sair">${svg("out")}</button>
    </div>`;

  document.getElementById("topbar").innerHTML = `
    <button class="topbar-btn" type="button" id="btn-menu" aria-controls="sidebar" aria-expanded="false" aria-label="Abrir menu">${svg("menu")}</button>
    <span class="topbar-brand"><img src="../assets/img/logo.png" alt="">ELO Campus</span>`;

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
