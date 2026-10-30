/* Gestão de equipe: o frontend nunca renderiza nem persiste valores de senha. */
"use strict";
(() => {
  const byId = (id) => document.getElementById(id);
  const form = byId("usuarios-api-form");
  if (!form) return;
  const aviso = byId("usuarios-api-aviso");
  const tbody = byId("api-usuarios-tbody");
  const botaoCriar = byId("api-usuario-criar");
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;

  function mostrarAviso(texto, tipo = "info") {
    aviso.className = `alert ${tipo === "ok" ? "alert-ok" : tipo === "error" ? "alert-error" : "alert-info"}`;
    aviso.textContent = texto;
    aviso.hidden = false;
  }
  function mensagemOperacao(resposta, acao) {
    if (resposta?.email_enviado === false) {
      return `${acao} foi concluída, mas o e-mail não foi enviado. Por segurança, nenhuma senha será exibida nesta tela. Verifique o serviço de e-mail e tente reenviar as instruções.`;
    }
    return resposta?.mensagem || resposta?.message || `${acao} concluída. Se a conta estiver ativa, as instruções serão enviadas ao e-mail cadastrado.`;
  }
  function perfilLegivel(papel) {
    return ({ admin: "Administrador", administrador: "Administrador", operador: "Operador" })[String(papel || "").toLowerCase()] || "—";
  }
  function adicionarCelula(linha, texto) {
    const celula = document.createElement("td");
    celula.textContent = texto || "—";
    linha.appendChild(celula);
    return celula;
  }
  async function carregar() {
    tbody.replaceChildren();
    const carregando = document.createElement("tr");
    const celula = document.createElement("td");
    celula.colSpan = 5;
    celula.textContent = "Carregando contas…";
    carregando.appendChild(celula);
    tbody.appendChild(carregando);
    try {
      const resposta = await ELO.usuarios();
      const usuarios = Array.isArray(resposta) ? resposta : [];
      tbody.replaceChildren();
      if (!usuarios.length) {
        const vazio = document.createElement("tr");
        const mensagem = document.createElement("td");
        mensagem.colSpan = 5;
        mensagem.textContent = "Nenhuma conta de equipe encontrada.";
        vazio.appendChild(mensagem);
        tbody.appendChild(vazio);
        return;
      }
      usuarios.forEach((usuario) => {
        const linha = document.createElement("tr");
        adicionarCelula(linha, usuario.nome);
        adicionarCelula(linha, usuario.email);
        adicionarCelula(linha, perfilLegivel(usuario.papel));
        const primeiroAcesso = document.createElement("td");
        const etiqueta = document.createElement("span");
        etiqueta.className = `pill ${usuario.deve_trocar_senha ? "pill-warn" : "pill-ok"}`;
        etiqueta.textContent = usuario.deve_trocar_senha ? "Aguardando primeiro acesso" : "Concluído";
        primeiroAcesso.appendChild(etiqueta);
        linha.appendChild(primeiroAcesso);
        const acoes = document.createElement("td");
        const reenviar = document.createElement("button");
        reenviar.type = "button";
        reenviar.className = "btn btn-sm btn-line";
        reenviar.textContent = "Reenviar instruções";
        // A API continua sendo a autoridade para impedir operações não permitidas, como desativar a própria conta.
        reenviar.addEventListener("click", async () => {
          const confirmado = confirm(`Reenviar as instruções de acesso para ${usuario.nome} (${usuario.email})?\n\nUma nova instrução será enviada ao endereço cadastrado.`);
          if (!confirmado) return;
          reenviar.disabled = true;
          reenviar.textContent = "Enviando…";
          try {
            const resultado = await ELO.reenviarSenha(usuario.id);
            mostrarAviso(mensagemOperacao(resultado, "A solicitação de reenvio"), resultado?.email_enviado === false ? "info" : "ok");
            await carregar();
          } catch (erro) {
            mostrarAviso(erro.message || "Não foi possível solicitar o reenvio das instruções.", "error");
          } finally {
            reenviar.disabled = false;
            reenviar.textContent = "Reenviar instruções";
          }
        });
        acoes.appendChild(reenviar);
        if (usuario.ativo !== false) {
          const desativar = document.createElement("button"); desativar.type = "button"; desativar.className = "btn btn-sm btn-ghost"; desativar.textContent = "Desativar";
          desativar.addEventListener("click", async () => {
            if (!confirm(`Desativar a conta de ${usuario.nome}?`)) return;
            try { const resultado = await ELO.desativarUsuario(usuario.id); mostrarAviso(resultado?.mensagem || "Conta desativada.", "ok"); await carregar(); }
            catch (erro) { mostrarAviso(erro.message || "Não foi possível desativar a conta.", "error"); }
          }); acoes.appendChild(desativar);
        }
        linha.appendChild(acoes);
        tbody.appendChild(linha);
      });
    } catch (erro) {
      tbody.replaceChildren();
      const linha = document.createElement("tr");
      const celulaErro = document.createElement("td");
      celulaErro.colSpan = 5;
      celulaErro.textContent = "Não foi possível carregar as contas. Tente atualizar a lista.";
      linha.appendChild(celulaErro);
      tbody.appendChild(linha);
      mostrarAviso(erro.message || "Falha ao consultar a API de usuários.", "error");
    }
  }

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const nomeEl = byId("api-usuario-nome");
    const emailEl = byId("api-usuario-email");
    const nome = nomeEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const papel = byId("api-usuario-papel").value;
    if (nome.split(/\s+/).filter(Boolean).length < 2) { mostrarAviso("Informe o nome completo.", "error"); nomeEl.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { mostrarAviso("Informe um e-mail válido.", "error"); emailEl.focus(); return; }
    if (!["admin", "operador"].includes(papel)) { mostrarAviso("Selecione um perfil válido.", "error"); return; }
    botaoCriar.disabled = true;
    botaoCriar.textContent = "Criando conta…";
    try {
      const resultado = await ELO.criarUsuario({ nome, email, papel });
      mostrarAviso(mensagemOperacao(resultado, "A criação da conta"), resultado?.email_enviado === false ? "info" : "ok");
      form.reset();
      await carregar();
    } catch (erro) {
      mostrarAviso(erro.message || "Não foi possível criar a conta.", "error");
    } finally {
      botaoCriar.disabled = false;
      botaoCriar.textContent = "Criar conta e enviar instruções";
    }
  });
  byId("api-usuarios-atualizar").addEventListener("click", carregar);
  // O identificador da sessão é mantido apenas para contexto; nenhum segredo de usuário é lido ou exibido aqui.
  void sessao;
  carregar();
})();
