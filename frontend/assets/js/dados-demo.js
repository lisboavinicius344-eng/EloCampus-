/* ELO Campus — dados de DEMONSTRAÇÃO
 * Datas calculadas a partir de hoje, para que atrasos e vencimentos
 * sempre apareçam. Remover quando a API real estiver integrada.
 * Quem consome estes dados é o api.js; as telas nunca leem este arquivo.
 */

const DEMO = (() => {
  const dia = (off, h = 9, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + off);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  // base: "ativo" | "manutencao" | "inativo" (o empréstimo é calculado à parte)
  const equipamentos = [
    { id: 1,  nome: "Caixa de som JBL",         patrimonio: "AUD-0031", categoria: "Áudio",      setor: "Audiovisual",  condicao: "Bom",       base: "ativo" },
    { id: 2,  nome: "Projetor Epson X49",       patrimonio: "PRJ-0017", categoria: "Projeção",   setor: "Audiovisual",  condicao: "Bom",       base: "ativo" },
    { id: 3,  nome: "Notebook Dell Latitude",   patrimonio: "LAP-0142", categoria: "Informática", setor: "Coordenação de TI", condicao: "Bom", base: "ativo" },
    { id: 4,  nome: "Tablet Samsung Tab A",     patrimonio: "TAB-0008", categoria: "Informática", setor: "Coordenação de TI", condicao: "Bom", base: "ativo" },
    { id: 5,  nome: "Câmera Canon T7",          patrimonio: "CAM-0004", categoria: "Foto e vídeo", setor: "Audiovisual", condicao: "Bom",      base: "ativo" },
    { id: 6,  nome: "Microfone sem fio",        patrimonio: "AUD-0012", categoria: "Áudio",      setor: "Audiovisual",  condicao: "Regular",   base: "ativo" },
    { id: 7,  nome: "Notebook Lenovo ThinkPad", patrimonio: "LAP-0150", categoria: "Informática", setor: "Coordenação de TI", condicao: "Bom", base: "ativo" },
    { id: 8,  nome: "Projetor BenQ MS550",      patrimonio: "PRJ-0021", categoria: "Projeção",   setor: "Biblioteca",   condicao: "Regular",   base: "ativo" },
    { id: 9,  nome: "Caixa de som Bose",        patrimonio: "AUD-0044", categoria: "Áudio",      setor: "Audiovisual",  condicao: "Danificado", base: "manutencao" },
    { id: 10, nome: "Câmera Nikon D3500",       patrimonio: "CAM-0009", categoria: "Foto e vídeo", setor: "Audiovisual", condicao: "Bom",      base: "ativo" },
    { id: 11, nome: "Tablet Positivo",          patrimonio: "TAB-0012", categoria: "Informática", setor: "Biblioteca",  condicao: "Bom",       base: "ativo" },
    { id: 12, nome: "Notebook Acer Aspire",     patrimonio: "LAP-0098", categoria: "Informática", setor: "Coordenação de TI", condicao: "Regular", base: "ativo" },
    { id: 13, nome: "Tripé Manfrotto",          patrimonio: "TRP-0003", categoria: "Acessórios", setor: "Audiovisual",  condicao: "Bom",       base: "ativo" },
    { id: 14, nome: "Mesa digitalizadora Wacom", patrimonio: "MES-0002", categoria: "Informática", setor: "Coordenação de TI", condicao: "Danificado", base: "inativo" },
    { id: 15, nome: "Projetor Epson S41",       patrimonio: "PRJ-0005", categoria: "Projeção",   setor: "Secretaria",   condicao: "Bom",       base: "ativo" },
    { id: 16, nome: "Webcam Logitech C920",     patrimonio: "CAM-0015", categoria: "Foto e vídeo", setor: "Coordenação de TI", condicao: "Bom", base: "ativo" },
    { id: 17, nome: "Notebook HP 240",          patrimonio: "LAP-0071", categoria: "Informática", setor: "Secretaria",  condicao: "Bom",       base: "ativo" },
    { id: 18, nome: "Microfone de lapela",      patrimonio: "AUD-0019", categoria: "Áudio",      setor: "Audiovisual",  condicao: "Regular",   base: "manutencao" },
  ];

  const emprestimos = [
    // ativos
    { id: 1,  equipamentoId: 1,  solicitante: "Grêmio Estudantil",  vinculo: "Grupo", retirada: dia(-6, 9, 15), prevista: dia(-4, 18), devolvida: null, por: "Estagiário TI" },
    { id: 2,  equipamentoId: 12, solicitante: "Prof. Tiago Nunes",  vinculo: "Professor", retirada: dia(-9, 8, 40), prevista: dia(-2, 18), devolvida: null, por: "Estagiário TI" },
    { id: 3,  equipamentoId: 13, solicitante: "Ana Beatriz Lima",   vinculo: "Aluna", retirada: dia(-5, 14, 5), prevista: dia(-1, 18), devolvida: null, por: "Operador" },
    { id: 4,  equipamentoId: 2,  solicitante: "Prof. Ricardo Alves", vinculo: "Professor", retirada: dia(-3, 10, 20), prevista: dia(0, 18), devolvida: null, por: "Estagiário TI" },
    { id: 5,  equipamentoId: 3,  solicitante: "Mariana Costa",      vinculo: "Aluna", retirada: dia(-2, 9, 0),  prevista: dia(1, 18),  devolvida: null, por: "Operador" },
    { id: 6,  equipamentoId: 4,  solicitante: "Juliana Rocha",      vinculo: "Aluna", retirada: dia(-1, 13, 30), prevista: dia(2, 18), devolvida: null, por: "Estagiário TI" },
    { id: 7,  equipamentoId: 5,  solicitante: "Lucas Ferreira",     vinculo: "Aluno", retirada: dia(-1, 8, 10), prevista: dia(3, 18),  devolvida: null, por: "Operador" },
    { id: 8,  equipamentoId: 6,  solicitante: "Coord. de Eventos",  vinculo: "Perfil", retirada: dia(-1, 15, 45), prevista: dia(3, 18), devolvida: null, por: "Estagiário TI" },
    // encerrados (histórico)
    { id: 9,  equipamentoId: 7,  solicitante: "Prof. Tiago Nunes",  vinculo: "Professor", retirada: dia(-6, 9, 0),  prevista: dia(-2, 18), devolvida: dia(-1, 14, 20), por: "Operador" },
    { id: 10, equipamentoId: 10, solicitante: "Ana Beatriz Lima",   vinculo: "Aluna", retirada: dia(-5, 11, 0), prevista: dia(-2, 18), devolvida: dia(-2, 16, 5),  por: "Estagiário TI" },
    { id: 11, equipamentoId: 16, solicitante: "Mariana Costa",      vinculo: "Aluna", retirada: dia(-7, 10, 0), prevista: dia(-3, 18), devolvida: dia(-3, 9, 30),  por: "Operador" },
  ];

  const manutencoes = [
    { equipamentoId: 9,  quando: dia(-3, 10, 15), por: "Estagiário TI" },
    { equipamentoId: 18, quando: dia(-5, 15, 0),  por: "Operador" },
  ];

  return { equipamentos, emprestimos, manutencoes };
})();

// Protótipo: equipamentos cadastrados/editados ficam no localStorage deste navegador.
// Para voltar aos dados originais: localStorage.removeItem("elo.demo.equipamentos")
const CHAVE_DEMO = "elo.demo.equipamentos";
try {
  const salvo = localStorage.getItem(CHAVE_DEMO);
  if (salvo) {
    const carregados = JSON.parse(salvo);
    if (Array.isArray(carregados)) DEMO.equipamentos = carregados.filter((e) => e && e.id != null && typeof e === "object");
  }
} catch { /* sem armazenamento: segue com os dados originais */ }

// Em modo de demonstração, operações novas são mantidas neste navegador.
// A camada é local e não representa uma gravação oficial no servidor.
const CHAVE_EMPRESTIMOS = "elo.demo.emprestimos";
try {
  const salvo = localStorage.getItem(CHAVE_EMPRESTIMOS);
  if (salvo) {
    const carregados = JSON.parse(salvo);
    if (Array.isArray(carregados)) DEMO.emprestimos = carregados.filter((l) => l && l.id != null && l.equipamentoId != null);
  }
} catch { /* mantém a base de demonstração */ }

function demoPersistirEmprestimos() {
  try { localStorage.setItem(CHAVE_EMPRESTIMOS, JSON.stringify(DEMO.emprestimos)); }
  catch { throw new Error("Não foi possível salvar a operação neste navegador. Verifique o espaço disponível e as permissões de armazenamento."); }
}

function demoDiasAtraso(prevista) {
  const a = new Date(prevista), hoje = new Date();
  a.setHours(0, 0, 0, 0); hoje.setHours(0, 0, 0, 0);
  return Math.round((hoje - a) / 86400000);
}

function demoEquipamentos() {
  return DEMO.equipamentos.filter((e) => e && e.id != null).map((e) => {
    const ativo = DEMO.emprestimos.find((l) => String(l.equipamentoId) === String(e.id) && !l.devolvida);
    let situacao = e.base === "ativo" ? "disponivel" : e.base;
    if (ativo) situacao = demoDiasAtraso(ativo.prevista) > 0 ? "atrasado" : "emprestado";
    return { ...e, situacao };
  });
}

function demoEmprestimos() {
  const porId = new Map(DEMO.equipamentos.map((e) => [String(e.id), e]));
  return DEMO.emprestimos.filter((l) => porId.has(String(l.equipamentoId))).map((l) => {
    const e = porId.get(String(l.equipamentoId));
    return {
      id: l.id,
      emprestimoId: l.emprestimoId ?? l.id,
      equipamento: { id: e.id, nome: e.nome, patrimonio: e.patrimonio, categoria: e.categoria, setor: e.setor, condicao: e.condicao },
      solicitante: { nome: l.solicitante, vinculo: l.vinculo || "", matricula: l.matricula || "" },
      retirada: l.retirada,
      prevista: l.prevista,
      devolvida: l.devolvida || null,
      registradoPor: l.por || "—",
      finalidade: l.finalidade || "",
      observacoes: l.observacoes || "",
      condicaoDevolucao: l.condicaoDevolucao || "",
      observacoesDevolucao: l.observacoesDevolucao || "",
      responsavelDevolucao: l.responsavelDevolucao || "",
      situacao: l.devolvida ? "devolvido" : (demoDiasAtraso(l.prevista) > 0 ? "atrasado" : "emprestado"),
    };
  }).sort((a, b) => new Date(b.retirada) - new Date(a.retirada));
}

function demoTextoNormalizado(valor) {
  return String(valor ?? "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function demoPerfilFinal(perfil) {
  return ["aluno", "professor", "servidor"].includes(String(perfil || "").toLowerCase());
}

function demoRegistrarEmprestimo(dados) {
  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  const usuarioFinal = demoPerfilFinal(sessao?.perfil);
  const solicitanteInformado = String(dados?.solicitante || "").trim();
  if (usuarioFinal && demoTextoNormalizado(solicitanteInformado) !== demoTextoNormalizado(sessao?.nome)) {
    throw new Error("Você só pode solicitar empréstimos em seu próprio nome.");
  }
  const solicitante = usuarioFinal ? String(sessao?.nome || "").trim() : solicitanteInformado;
  const vinculoConta = { aluno: "Aluno", professor: "Professor", servidor: "Servidor" }[String(sessao?.perfil || "").toLowerCase()] || "";
  const equipamentosIds = [...new Set((dados?.equipamentos || []).map(String))];
  const retirada = dados?.retirada ? new Date(dados.retirada) : new Date();
  const prevista = dados?.prevista ? new Date(dados.prevista) : null;
  if (!solicitante) throw new Error("Selecione um solicitante.");
  if (!equipamentosIds.length) throw new Error("Adicione pelo menos um equipamento.");
  if (!Number.isFinite(retirada.getTime()) || !prevista || !Number.isFinite(prevista.getTime())) throw new Error("Informe as datas de retirada e devolução prevista.");
  if (prevista <= retirada) throw new Error("A devolução prevista deve ocorrer depois da retirada.");

  const disponibilidade = demoEquipamentos();
  const indisponiveis = equipamentosIds.map((id) => disponibilidade.find((e) => String(e.id) === id)).filter((e) => !e || e.situacao !== "disponivel");
  if (indisponiveis.length) throw new Error(`Os seguintes equipamentos não estão disponíveis: ${indisponiveis.map((e) => e?.nome || "equipamento não encontrado").join(", ")}.`);

  const maxId = Math.max(0, ...DEMO.emprestimos.map((l) => Number(l.id) || 0));
  const maxGrupo = Math.max(0, ...DEMO.emprestimos.map((l) => Number(l.emprestimoId || l.id) || 0));
  const emprestimoId = maxGrupo + 1;
  const novos = equipamentosIds.map((equipamentoId, i) => ({
    id: maxId + i + 1,
    emprestimoId,
    equipamentoId: Number.isNaN(Number(equipamentoId)) ? equipamentoId : Number(equipamentoId),
    solicitante,
    vinculo: usuarioFinal ? vinculoConta : String(dados.vinculo || "").trim(),
    matricula: usuarioFinal ? String(sessao?.matricula || "").trim() : String(dados.matricula || "").trim(),
    retirada: retirada.toISOString(),
    prevista: prevista.toISOString(),
    devolvida: null,
    finalidade: String(dados.finalidade || "").trim(),
    observacoes: String(dados.observacoes || "").trim(),
    por: sessao?.nome || "Usuário da sessão local",
  }));
  const tamanhoAnterior = DEMO.emprestimos.length;
  DEMO.emprestimos.push(...novos);
  try {
    demoPersistirEmprestimos();
  } catch (erro) {
    DEMO.emprestimos.splice(tamanhoAnterior, novos.length);
    throw erro;
  }
  return { id: emprestimoId, itens: novos.length, registradoEm: retirada.toISOString(), local: true };
}

function demoRegistrarDevolucao(dados) {
  const ids = [...new Set((dados?.itens || []).map(String))];
  if (!ids.length) throw new Error("Selecione pelo menos um equipamento para devolver.");
  const encontrados = ids.map((id) => DEMO.emprestimos.find((l) => String(l.id) === id));
  if (encontrados.some((l) => !l)) throw new Error("Um ou mais itens não foram encontrados. Atualize a página e tente novamente.");
  if (encontrados.some((l) => l.devolvida)) throw new Error("Um ou mais itens já foram devolvidos. Atualize a página para conferir a situação atual.");

  const sessao = typeof obterSessao === "function" ? obterSessao() : null;
  if (demoPerfilFinal(sessao?.perfil)) {
    const nomeSessao = demoTextoNormalizado(sessao?.nome);
    const matriculaSessao = demoTextoNormalizado(sessao?.matricula);
    const deOutraPessoa = encontrados.some((l) => {
      const mesmoNome = demoTextoNormalizado(l.solicitante) === nomeSessao;
      const mesmaMatricula = Boolean(matriculaSessao && demoTextoNormalizado(l.matricula) && demoTextoNormalizado(l.matricula) === matriculaSessao);
      return !mesmoNome && !mesmaMatricula;
    });
    if (deOutraPessoa) throw new Error("Você só pode registrar devoluções de equipamentos vinculados ao seu cadastro.");
  }
  const agora = new Date().toISOString();
  const camposDevolucao = ["devolvida", "condicaoDevolucao", "observacoesDevolucao", "acessoriosConferidos", "equipamentoConferido", "assinaturaRecebida", "responsavelDevolucao"];
  const anteriores = encontrados.map((l) => Object.fromEntries(camposDevolucao.map((campo) => [campo, l[campo]])));
  encontrados.forEach((l) => {
    l.devolvida = agora;
    l.condicaoDevolucao = String(dados.condicao || "Perfeito");
    l.observacoesDevolucao = String(dados.observacoes || "").trim();
    l.acessoriosConferidos = Boolean(dados.acessoriosConferidos);
    l.equipamentoConferido = Boolean(dados.equipamentoConferido);
    l.assinaturaRecebida = Boolean(dados.assinaturaRecebida);
    l.responsavelDevolucao = sessao?.nome || "Usuário da sessão local";
  });
  try {
    demoPersistirEmprestimos();
  } catch (erro) {
    encontrados.forEach((l, i) => camposDevolucao.forEach((campo) => {
      if (anteriores[i][campo] === undefined) delete l[campo];
      else l[campo] = anteriores[i][campo];
    }));
    throw erro;
  }
  return { itens: encontrados.length, devolvidoEm: agora, local: true };
}

function demoConsultaQr(codigo) {
  let bruto = String(codigo || "").trim();
  if (!bruto) throw new Error("Informe o patrimônio, identificador ou QR Code.");
  // QR Codes podem conter o patrimônio diretamente ou uma URL da própria consulta.
  try {
    const url = new URL(bruto);
    bruto = url.searchParams.get("codigo") || url.searchParams.get("patrimonio") || url.searchParams.get("qr") || url.searchParams.get("id") || url.pathname.split("/").filter(Boolean).pop() || bruto;
  } catch { /* identificador simples: mantém o valor informado */ }
  const termo = bruto.trim().toLocaleLowerCase("pt-BR");
  const encontrados = demoEquipamentos();
  const e = encontrados.find((item) => [item.patrimonio, item.id, item.nome].some((v) => String(v ?? "").trim().toLocaleLowerCase("pt-BR") === termo));
  if (!e) throw new Error("Nenhum equipamento corresponde a esse código na fonte de dados local.");
  const ativo = demoEmprestimos().find((l) => String(l.equipamento.id) === String(e.id) && !l.devolvida);
  return { equipamento: e, emprestimo: ativo || null, fonte: "local" };
}

function demoResumo() {
  const lista = demoEquipamentos();
  const conta = (s) => lista.filter((e) => e.situacao === s).length;
  return {
    total: lista.length,
    disponiveis: conta("disponivel"),
    emprestados: conta("emprestado"),
    atrasados: conta("atrasado"),
    manutencao: conta("manutencao"),
    inativos: conta("inativo"),
  };
}

function demoMovimentacoes() {
  const eventos = [];
  demoEmprestimos().forEach((l) => {
    eventos.push({ classe: "retirada", tipo: "Retirada registrada", quando: l.retirada, equipamento: l.equipamento, detalhe: l.solicitante.nome, por: l.registradoPor });
    if (l.devolvida) {
      eventos.push({ classe: "devolucao", tipo: "Devolução registrada", quando: l.devolvida, equipamento: l.equipamento, detalhe: `${l.solicitante.nome}${l.condicaoDevolucao ? ` · condição: ${l.condicaoDevolucao}` : ""}${l.observacoesDevolucao ? ` · ${l.observacoesDevolucao}` : ""}`, por: l.responsavelDevolucao || l.registradoPor });
    }
  });
  DEMO.manutencoes.forEach((m) => {
    const e = DEMO.equipamentos.find((x) => x.id === m.equipamentoId);
    if (!e) return;
    eventos.push({ classe: "manutencao", tipo: "Manutenção iniciada", quando: m.quando, equipamento: { id: e.id, nome: e.nome, patrimonio: e.patrimonio, categoria: e.categoria }, detalhe: "", por: m.por });
  });
  return eventos.sort((a, b) => new Date(b.quando) - new Date(a.quando));
}

function demoEquipamento(id) {
  const e = demoEquipamentos().find((x) => String(x.id) === String(id));
  if (!e) throw new Error("Equipamento não encontrado. Ele pode ter sido removido.");
  return e;
}

function demoSalvarEquipamento(d, id) {
  const anteriores = DEMO.equipamentos.slice();
  const pat = d.patrimonio.trim().toUpperCase();
  const duplicado = DEMO.equipamentos.find((e) => e.patrimonio.toUpperCase() === pat && String(e.id) !== String(id));
  if (duplicado) {
    const erro = new Error(`O patrimônio ${pat} já está cadastrado em “${duplicado.nome}”.`);
    erro.campo = "patrimonio";
    throw erro;
  }

  const dados = {
    nome: d.nome.trim(),
    patrimonio: pat,
    categoria: d.categoria.trim(),
    setor: d.setor.trim(),
    condicao: d.condicao,
    observacoes: (d.observacoes || "").trim(),
    imagem: d.imagem || "",
  };

  let salvo;
  if (id) {
    const i = DEMO.equipamentos.findIndex((e) => String(e.id) === String(id));
    if (i < 0) throw new Error("Equipamento não encontrado. Ele pode ter sido removido.");
    salvo = { ...DEMO.equipamentos[i], ...dados };
    DEMO.equipamentos[i] = salvo;
  } else {
    salvo = { id: Math.max(0, ...DEMO.equipamentos.map((e) => e.id)) + 1, base: "ativo", ...dados };
    DEMO.equipamentos.push(salvo);
  }

  try {
    localStorage.setItem(CHAVE_DEMO, JSON.stringify(DEMO.equipamentos));
  } catch {
    DEMO.equipamentos.splice(0, DEMO.equipamentos.length, ...anteriores);
    throw new Error("Não foi possível salvar o cadastro neste navegador. Verifique o espaço disponível e as permissões de armazenamento.");
  }
  return salvo;
}

function demoRemoverEquipamento(id) {
  const i = DEMO.equipamentos.findIndex(e => String(e.id) === String(id));
  if (i < 0) throw new Error("Equipamento não encontrado.");
  const emprestado = DEMO.emprestimos.some(l => String(l.equipamentoId) === String(id) && !l.devolvida);
  if (emprestado) throw new Error("Não é possível retirar um equipamento que está emprestado.");

  // Se existe histórico, desativa o bem em vez de apagá-lo e perder a trilha de movimentações.
  const temHistorico = DEMO.emprestimos.some(l => String(l.equipamentoId) === String(id));
  const anteriores = DEMO.equipamentos.slice();
  if (temHistorico) DEMO.equipamentos[i] = { ...DEMO.equipamentos[i], base: "inativo" };
  else DEMO.equipamentos.splice(i, 1);
  try {
    localStorage.setItem(CHAVE_DEMO, JSON.stringify(DEMO.equipamentos));
  } catch {
    DEMO.equipamentos.splice(0, DEMO.equipamentos.length, ...anteriores);
    throw new Error("Não foi possível atualizar o cadastro neste navegador. Verifique o espaço disponível e as permissões de armazenamento.");
  }
  return { arquivado: temHistorico, removido: !temHistorico };
}
