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
    { id: 1,  equipamentoId: 1,  solicitante: "Grêmio Estudantil",  retirada: dia(-6, 9, 15), prevista: dia(-4, 18), devolvida: null, por: "Estagiário TI" },
    { id: 2,  equipamentoId: 12, solicitante: "Prof. Tiago Nunes",  retirada: dia(-9, 8, 40), prevista: dia(-2, 18), devolvida: null, por: "Estagiário TI" },
    { id: 3,  equipamentoId: 13, solicitante: "Ana Beatriz Lima",   retirada: dia(-5, 14, 5), prevista: dia(-1, 18), devolvida: null, por: "Operador" },
    { id: 4,  equipamentoId: 2,  solicitante: "Prof. Ricardo Alves", retirada: dia(-3, 10, 20), prevista: dia(0, 18), devolvida: null, por: "Estagiário TI" },
    { id: 5,  equipamentoId: 3,  solicitante: "Mariana Costa",      retirada: dia(-2, 9, 0),  prevista: dia(1, 18),  devolvida: null, por: "Operador" },
    { id: 6,  equipamentoId: 4,  solicitante: "Juliana Rocha",      retirada: dia(-1, 13, 30), prevista: dia(2, 18), devolvida: null, por: "Estagiário TI" },
    { id: 7,  equipamentoId: 5,  solicitante: "Lucas Ferreira",     retirada: dia(-1, 8, 10), prevista: dia(3, 18),  devolvida: null, por: "Operador" },
    { id: 8,  equipamentoId: 6,  solicitante: "Coord. de Eventos",  retirada: dia(-1, 15, 45), prevista: dia(3, 18), devolvida: null, por: "Estagiário TI" },
    // encerrados (histórico)
    { id: 9,  equipamentoId: 7,  solicitante: "Prof. Tiago Nunes",  retirada: dia(-6, 9, 0),  prevista: dia(-2, 18), devolvida: dia(-1, 14, 20), por: "Operador" },
    { id: 10, equipamentoId: 10, solicitante: "Ana Beatriz Lima",   retirada: dia(-5, 11, 0), prevista: dia(-2, 18), devolvida: dia(-2, 16, 5),  por: "Estagiário TI" },
    { id: 11, equipamentoId: 16, solicitante: "Mariana Costa",      retirada: dia(-7, 10, 0), prevista: dia(-3, 18), devolvida: dia(-3, 9, 30),  por: "Operador" },
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
  if (salvo) DEMO.equipamentos = JSON.parse(salvo);
} catch { /* sem armazenamento: segue com os dados originais */ }

function demoEquipamentos() {
  return DEMO.equipamentos.map((e) => {
    const ativo = DEMO.emprestimos.find((l) => l.equipamentoId === e.id && !l.devolvida);
    let situacao = e.base === "ativo" ? "disponivel" : e.base;
    if (ativo) situacao = EloUtil.diasAtraso(ativo.prevista) > 0 ? "atrasado" : "emprestado";
    return { ...e, situacao };
  });
}

function demoEmprestimos() {
  const porId = new Map(DEMO.equipamentos.map((e) => [e.id, e]));
  return DEMO.emprestimos.map((l) => {
    const e = porId.get(l.equipamentoId);
    return {
      id: l.id,
      equipamento: { id: e.id, nome: e.nome, patrimonio: e.patrimonio },
      solicitante: { nome: l.solicitante },
      retirada: l.retirada,
      prevista: l.prevista,
      devolvida: l.devolvida,
      registradoPor: l.por,
    };
  });
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
      eventos.push({ classe: "devolucao", tipo: "Devolução registrada", quando: l.devolvida, equipamento: l.equipamento, detalhe: l.solicitante.nome, por: l.registradoPor });
    }
  });
  DEMO.manutencoes.forEach((m) => {
    const e = DEMO.equipamentos.find((x) => x.id === m.equipamentoId);
    eventos.push({ classe: "manutencao", tipo: "Manutenção iniciada", quando: m.quando, equipamento: { id: e.id, nome: e.nome, patrimonio: e.patrimonio }, detalhe: "", por: m.por });
  });
  return eventos.sort((a, b) => new Date(b.quando) - new Date(a.quando));
}

function demoEquipamento(id) {
  const e = demoEquipamentos().find((x) => String(x.id) === String(id));
  if (!e) throw new Error("Equipamento não encontrado. Ele pode ter sido removido.");
  return e;
}

function demoSalvarEquipamento(d, id) {
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

  try { localStorage.setItem(CHAVE_DEMO, JSON.stringify(DEMO.equipamentos)); } catch { /* ignora */ }
  return salvo;
}