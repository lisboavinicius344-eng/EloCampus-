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
  const perfisValidos = new Set(["administrador", "operador", "aluno", "professor"]);
  if (!sessao && !publico) { window.location.replace("../index.html"); return; }
  if (!sessao) sessao = { nome: "Consulta pública", perfil: "visitante" };
  const perfilAtual = String(sessao.perfil || "").toLowerCase();
  const equipe = ["administrador", "operador"].includes(perfilAtual);
  const usuarioFinal = ["aluno", "professor"].includes(perfilAtual);
  const paginaAtual = document.body.dataset.pagina;
  const arquivoAtual = window.location.pathname.split("/").pop();
  const paginasRestritas = ["movimentacoes.html", "usuarios.html", "solicitantes.html", "relatorio.html", "servidor.html", "equipamento-form.html", "manutencoes.html", "categorias.html", "solicitacoes-acesso.html"];
  const paginasUsuario = ["dashboard.html", "disponiveis.html", "consulta-qr-interno.html", "emprestimos.html", "novo-emprestimo.html", "reservas.html", "perfil.html", "trocar-senha.html"];

  // O controle de navegação evita acessos acidentais pela URL; segurança real
  // precisa ser aplicada no backend quando a autenticação institucional existir.
  if (!publico && !perfisValidos.has(perfilAtual)) {
    try { sessionStorage.removeItem("elo.sessao"); localStorage.removeItem("elo.sessao"); } catch {}
    window.location.replace("../index.html");
    return;
  }
  if (usuarioFinal && ["equipamentos.html", "equipamento-detalhe.html"].includes(arquivoAtual)) {
    window.location.replace("disponiveis.html");
    return;
  }
  if (usuarioFinal && !paginasUsuario.includes(arquivoAtual)) {
    window.location.replace("dashboard.html");
    return;
  }
  if (!publico && paginasRestritas.includes(arquivoAtual) && !equipe) {
    window.location.replace("dashboard.html");
    return;
  }
  // A API limita a gestão de contas (/usuarios) ao administrador, embora
  // operadores também possam gerir solicitantes.
  if (!publico && ["usuarios.html", "solicitacoes-acesso.html"].includes(arquivoAtual) && perfilAtual !== "administrador") {
    window.location.replace("dashboard.html");
    return;
  }
  document.body.dataset.perfil = perfilAtual;
  if (usuarioFinal) document.body.classList?.add("self-service-user");

  const ICONES = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
    wrench: '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 12l-2-2z"/><path d="m16 4 4 4"/>',
    clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4.5V3h6v1.5M8 10h8M8 14h8M8 18h5"/>',
    qrscan: '<path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><rect x="7" y="7" width="4" height="4"/><rect x="15" y="7" width="2" height="2"/><path d="M15 13h2v2h-2zM18 16h2M13 18v2"/>',
    categories: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    qr: '<path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z"/><path d="M15 15h2v2h-2zM19 15h2v6h-6v-2M11 3v2M11 9v2M3 11h2M9 11v2M11 15v2M11 21h2M15 11h2M21 11v2"/>',
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
  const NAV_EQUIPE = [
    { id: "painel", rotulo: "Painel", icone: "home", href: "dashboard.html" },
    { grupo: "Acervo", itens: [
      { id: "equipamentos", rotulo: "Equipamentos", icone: "box", href: "equipamentos.html" },
      { id: "categorias", rotulo: "Categorias", icone: "categories", href: "categorias.html" },
      { id: "consulta-qr", rotulo: "Consulta por QR Code", icone: "qr", href: "consulta-qr-interno.html" },
    ]},
    { grupo: "Empréstimos e devoluções", itens: [
      { id: "emprestimos", rotulo: "Empréstimos", icone: "swap", href: "emprestimos.html" },
      { id: "devolucoes", rotulo: "Devoluções", icone: "undo", href: "devolucoes.html" },
      { id: "reservas", rotulo: "Reservas", icone: "swap", href: "reservas.html" },
      { id: "manutencoes", rotulo: "Manutenções", icone: "wrench", href: "manutencoes.html" },
    ]},
    { grupo: "Administração", itens: [
      { id: "solicitantes", rotulo: "Solicitantes", icone: "people", href: "solicitantes.html" },
      { id: "solicitacoes-acesso", rotulo: "Solicitações de acesso", icone: "people-admin", href: "solicitacoes-acesso.html", admin: true },
      { id: "movimentacoes", rotulo: "Histórico de movimentações", icone: "swap", href: "movimentacoes.html", admin: true },
      { id: "usuarios", rotulo: "Equipe do sistema", icone: "people-admin", href: "usuarios.html", admin: true }
    ]},
    { id: "perfil", rotulo: "Configuração do perfil", icone: "gear", href: "perfil.html" },
  ];

  // Para discentes e docentes, o menu é uma área de autoatendimento:
  // (servidores são apenas solicitantes cadastrados, sem conta própria)
  // sem termos administrativos, cadastro interno ou informações de operação.
  const NAV_USUARIO = [
    { id: "painel", rotulo: "Início", icone: "home", href: "dashboard.html" },
    { id: "disponiveis", rotulo: "Ver os equipamentos", icone: "box", href: "disponiveis.html" },
    { id: "consulta-qr", rotulo: "Consultar QR Code", icone: "qrscan", href: "consulta-qr-interno.html" },
    { id: "pedir", rotulo: "Reservar equipamento", icone: "swap", href: "novo-emprestimo.html" },
    { id: "reservas", rotulo: "Minhas reservas", icone: "swap", href: "reservas.html" },
    { id: "emprestimos", rotulo: "Meus empréstimos", icone: "clipboard", href: "emprestimos.html" },
  ];
  const NAV = usuarioFinal ? NAV_USUARIO : NAV_EQUIPE;

  const atual = usuarioFinal && arquivoAtual === "novo-emprestimo.html" ? "pedir" : document.body.dataset.pagina;
  const itemPermitido = (i) => !i.admin || equipe;
  const itemHtml = (i) => {
    if (!itemPermitido(i)) return "";
    const ativo = i.id === atual;
    const icon = svg(i.icone);
    const badge = i.id === "solicitacoes-acesso" ? '<span class="nav-count" id="solicitacoes-pendentes-count" hidden></span>' : "";
    return `<li><a class="nav-item${ativo ? " is-active" : ""}" href="${i.href}"${ativo ? ' aria-current="page"' : ""}>${icon}<span>${i.rotulo}</span>${badge}</a></li>`;
  };
  const itens = NAV.map((item) => {
    if (!item.grupo) return itemHtml(item);
    const visiveis = item.itens.filter(itemPermitido);
    if (!visiveis.length) return "";
    const aberto = visiveis.some((i) => i.id === atual);
    return `<li class="nav-section"><details${aberto ? " open" : ""}><summary><span>${item.grupo}</span><b aria-hidden="true">›</b></summary><ul>${visiveis.map(itemHtml).join("")}</ul></details></li>`;
  }).join("");

  const nome = EloUtil.esc(sessao.nome || "Usuário");
  const iniciais = (sessao.nome || "U").split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const ROTULOS_PERFIL = { administrador: "Administrador · TI", operador: "Equipe operacional", aluno: "Discente", professor: "Docente" };
  const perfil = usuarioFinal ? "Minha conta" : (ROTULOS_PERFIL[perfilAtual] || (sessao.perfil ? sessao.perfil[0].toUpperCase() + sessao.perfil.slice(1) : ""));
  const subtituloMarca = usuarioFinal ? "" : "<small>Instituição - Campus Lapa</small>";

  document.getElementById("sidebar").innerHTML = `
    <a class="side-brand" href="dashboard.html">
      <img src="../assets/img/logo.png" alt="">
      <span>ELO Campus${subtituloMarca}</span>
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

  if (perfilAtual === "administrador" && typeof ELO !== "undefined" && typeof ELO.solicitacoesAcesso === "function") {
    ELO.solicitacoesAcesso("pendente").then((pendentes) => {
      const contador = document.getElementById("solicitacoes-pendentes-count");
      if (!contador) return;
      const total = Array.isArray(pendentes) ? pendentes.length : 0;
      contador.textContent = String(total);
      contador.hidden = total === 0;
      contador.setAttribute("aria-label", `${total} solicitações pendentes`);
    }).catch(() => { /* menu permanece utilizável se a rota não estiver disponível */ });
  }

  if (usuarioFinal) {
    document.querySelectorAll('a[href="equipamento-form.html"], a[href="movimentacoes.html"], a[href="relatorio.html"], a[href="usuarios.html"], a[href="solicitantes.html"], a[href="servidor.html"]').forEach((el) => { el.hidden = true; el.style.display = "none"; });
    document.querySelectorAll('#editar, #retirar, #confirmar-exclusao, [data-editar], #btn-novo-usuario').forEach((el) => { el.hidden = true; el.disabled = true; el.style.display = "none"; });
  }

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
