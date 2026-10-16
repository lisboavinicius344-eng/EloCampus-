(() => {
  const KEY = "elo.demo.movimentacoes";
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} };
  const formNovo = document.querySelector('form[action="#"]');
  if (document.body.dataset.pagina === "novo-emprestimo" && formNovo) {
    formNovo.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!confirm("Confirmar a entrega do equipamento e registrar este empréstimo?")) return;
      const equipamento = document.getElementById("equip")?.value.trim() || "Equipamento selecionado";
      const solicitante = document.getElementById("solicitante")?.value.trim() || "Solicitante";
      const prevista = document.getElementById("devolucao")?.value || new Date(Date.now() + 86400000).toISOString();
      const eventos = read();
      eventos.unshift({ tipo: "Retirada registrada", classe: "retirada", quando: new Date().toISOString(), equipamento: { nome: equipamento, patrimonio: equipamento }, detalhe: solicitante, por: "Usuário atual", prevista, ativa: true });
      save(eventos);
      alert("Empréstimo registrado. Ele já aparecerá no painel como item a devolver.");
      window.location.href = "dashboard.html";
    });
  }
})();
