/* ELO Campus — utilitários compartilhados (sem dependência de sessão)
 * Usado também pela página pública de consulta por QR Code. */

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