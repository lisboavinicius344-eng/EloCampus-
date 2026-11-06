(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const avisoEl = $("man-aviso"), tbody = $("man-tbody"), esc = EloUtil.esc;
  let equipamentosAtuais = [];

  function aviso(texto, tipo = "info") {
    avisoEl.hidden = false;
    avisoEl.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "error" ? "alert-error" : "alert-info"}`;
    avisoEl.textContent = texto;
  }

  async function carregar() {
    try {
      const [manutencoes, equipamentos] = await Promise.all([ELO.manutencoes(), ELO.equipamentos()]);
      equipamentosAtuais = Array.isArray(equipamentos) ? equipamentos : [];
      const seletor = $("man-equip");
      seletor.replaceChildren();
      equipamentosAtuais
        .filter(e => e.status !== "baixado" && e.situacao !== "inativo" && e.status !== "inativo")
        .forEach(e => seletor.add(new Option(`${e.nome} — ${e.patrimonio || e.id}`, String(e.id))));

      let rows = Array.isArray(manutencoes) ? manutencoes : [];
      const filtro = $("man-status").value;
      if (filtro) rows = rows.filter(x => x.status === filtro);
      tbody.replaceChildren();
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="6">Nenhuma manutenção para exibir.</td></tr>';
        return;
      }

      rows.forEach(m => {
        const nomeEquipamento = typeof m.equipamento === "object" ? m.equipamento?.nome : m.equipamento;
        const equipamento = equipamentosAtuais.find(e =>
          (m.equipamento_id != null && String(e.id) === String(m.equipamento_id)) ||
          (m.equipamento?.id != null && String(e.id) === String(m.equipamento.id)) ||
          (nomeEquipamento && String(e.nome).trim().toLocaleLowerCase("pt-BR") === String(nomeEquipamento).trim().toLocaleLowerCase("pt-BR")) ||
          (m.numero_patrimonio && String(e.patrimonio) === String(m.numero_patrimonio))
        );
        const equipamentoId = m.equipamento_id ?? m.equipamento?.id ?? equipamento?.id ?? null;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${esc(m.equipamento?.nome || m.equipamento || equipamento?.nome || "—")}</td>
          <td>${esc(m.numero_patrimonio || equipamento?.patrimonio || "—")}</td>
          <td>${esc(m.descricao_problema || "—")}</td>
          <td>${esc(m.data_abertura ? new Date(m.data_abertura).toLocaleString("pt-BR") : "—")}</td>
          <td>${esc(m.status || "—")}</td><td><div class="api-actions"></div></td>`;
        const actions = tr.querySelector(".api-actions");

        const estadoStatus = String(equipamento?.status || "").toLowerCase();
        const estadoSituacao = String(equipamento?.situacao || "").toLowerCase();
        if (equipamentoId && !["baixado", "inativo"].includes(estadoStatus) && !["baixado", "inativo"].includes(estadoSituacao)) {
          const inativarBtn = document.createElement("button");
          inativarBtn.className = "btn btn-danger";
          inativarBtn.type = "button";
          inativarBtn.textContent = "Inativar equipamento";
          inativarBtn.addEventListener("click", async () => {
            const motivo = await EloUtil.prompt("Motivo da inativação (obrigatório)", "Explique por que este equipamento não deve mais integrar o acervo.");
            if (motivo === null) return;
            if (!motivo.trim()) { aviso("Informe o motivo da inativação.", "error"); return; }
            if (!(await EloUtil.confirm(`Inativar “${equipamento?.nome || nomeEquipamento || "este equipamento"}”? O histórico será preservado.`))) return;
            inativarBtn.disabled = true;
            try {
              await ELO.removerEquipamento(String(equipamentoId), { observacoes: motivo.trim() });
              aviso("Equipamento inativado. O histórico da manutenção foi preservado.", "ok");
              await carregar();
            } catch (erro) {
              aviso(erro.message || "Não foi possível inativar o equipamento.", "error");
              inativarBtn.disabled = false;
            }
          });
          actions.append(inativarBtn);
        }

        if (["aberta", "em_andamento"].includes(m.status)) {
          const wrap = document.createElement("div");
          wrap.className = "stack-sm maintenance-finish";
          const solucao = document.createElement("textarea");
          solucao.className = "input input-block"; solucao.rows = 2; solucao.maxLength = 1000;
          solucao.placeholder = "Solução aplicada (obrigatório)";
          solucao.setAttribute("aria-label", "Solução aplicada");
          const label = document.createElement("label"); label.textContent = "Estado após a manutenção";
          const estado = document.createElement("select"); estado.className = "input input-block";
          [["bom", "Bom"], ["novo", "Novo"], ["regular", "Regular"]].forEach(([v, t]) => estado.add(new Option(t, v)));
          const finalizar = document.createElement("button");
          finalizar.className = "btn btn-line"; finalizar.type = "button"; finalizar.textContent = "Finalizar";
          finalizar.addEventListener("click", async () => {
            if (!solucao.value.trim()) { aviso("Descreva a solução aplicada antes de finalizar.", "error"); solucao.focus(); return; }
            finalizar.disabled = true;
            try {
              const r = await ELO.finalizarManutencao(m.id, { solucao: solucao.value.trim(), estado_conservacao: estado.value });
              aviso(r?.mensagem || "Manutenção finalizada.", "ok"); await carregar();
            } catch (e) { aviso(e.message || "Não foi possível finalizar a manutenção.", "error"); finalizar.disabled = false; }
          });
          wrap.append(solucao, label, estado, finalizar);
          actions.append(wrap);
        }

        tbody.append(tr);
      });
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6">${esc(e.message || "Falha ao carregar manutenções.")}</td></tr>`;
    }
  }

  $("man-form").addEventListener("submit", async event => {
    event.preventDefault();
    const equipamento = equipamentosAtuais.find(e => String(e.id) === String($("man-equip").value));
    const descricao = $("man-desc").value.trim();
    if (!equipamento || !descricao) return aviso("Selecione o equipamento e descreva o problema.", "error");
    if (!(await EloUtil.confirm(`Enviar ${equipamento.nome} para manutenção?\n\nProblema: ${descricao}`))) return;
    if (!(await EloUtil.confirm("Confirmação final: registrar a manutenção deste equipamento?"))) return;

    const submit = $("man-form").querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const r = await ELO.abrirManutencao({ equipamento_id: Number(equipamento.id), descricao_problema: descricao });
      aviso(r?.mensagem || "Equipamento enviado para manutenção.", "ok");
      $("man-desc").value = "";
      await carregar();
    } catch (e) {
      aviso(e.message || "Não foi possível enviar o equipamento para manutenção.", "error");
    } finally {
      submit.disabled = false;
    }
  });
  $("man-status").addEventListener("change", carregar);
  $("man-refresh").addEventListener("click", carregar);
  carregar();
})();