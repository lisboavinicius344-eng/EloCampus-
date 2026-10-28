const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dataSource = fs.readFileSync(path.join(__dirname, 'fixtures/dados-demo.js'), 'utf8');

function makeStorage() {
  const values = new Map();
  return {
    failWrites: false,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (this.failWrites) throw new Error('storage unavailable');
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
  };
}
function createContext(localStorage) {
  const context = {
    console, localStorage, URL, Date, Map, Set, Math, Number, String, Boolean,
    Object, Array, JSON, Error, Promise, encodeURIComponent, decodeURIComponent,
    obterSessao: () => ({ nome: 'Teste automatizado', perfil: 'operador' }),
  };
  vm.createContext(context);
  vm.runInContext(dataSource, context, { filename: 'dados-demo.js' });
  return context;
}

(async () => {
  const storage = makeStorage();
  let ctx = createContext(storage);
  const inicial = vm.runInContext('DEMO.emprestimos.length', ctx);

  const qr = vm.runInContext('demoConsultaQr("LAP-0142")', ctx);
  assert.equal(qr.equipamento.patrimonio, 'LAP-0142', 'patrimônio deve ser consultável localmente');
  const qrUrl = vm.runInContext('demoConsultaQr("https://campus.example/consulta-qr.html?codigo=PRJ-0017")', ctx);
  assert.equal(qrUrl.equipamento.patrimonio, 'PRJ-0017', 'QR em formato de URL deve resolver o parâmetro de código');

  const idsDisponiveis = vm.runInContext('demoEquipamentos().filter(e => e.situacao === "disponivel").slice(0, 2).map(e => e.id)', ctx);
  assert.equal(idsDisponiveis.length, 2, 'a base deve ter equipamentos disponíveis para o teste');
  const retirada = new Date();
  const prevista = new Date(retirada.getTime() + 24 * 60 * 60 * 1000);
  const criado = vm.runInContext(`demoRegistrarEmprestimo(${JSON.stringify({
    solicitante: 'Solicitante de teste', vinculo: 'Aluno', matricula: 'TESTE-01',
    equipamentos: idsDisponiveis, retirada: retirada.toISOString(), prevista: prevista.toISOString(),
    finalidade: 'Teste automatizado', observacoes: 'Operação de teste local',
  })})`, ctx);
  assert.equal(criado.itens, 2, 'novo empréstimo deve aceitar vários itens');
  assert.equal(vm.runInContext('DEMO.emprestimos.length', ctx), inicial + 2, 'deve criar exatamente um registro por item');
  const novos = vm.runInContext(`demoEmprestimos().filter(l => String(l.emprestimoId) === String(${criado.id}))`, ctx);
  assert.equal(novos.length, 2, 'todos os itens devem pertencer ao mesmo empréstimo');
  assert.equal(new Set(novos.map(l => l.equipamento.id)).size, 2, 'não deve duplicar equipamento no empréstimo');

  assert.throws(() => vm.runInContext(`demoRegistrarEmprestimo(${JSON.stringify({
    solicitante: 'Solicitante de teste', equipamentos: idsDisponiveis,
    retirada: retirada.toISOString(), prevista: prevista.toISOString(),
  })})`, ctx), /não estão disponíveis/, 'não deve emprestar equipamento que já está em uso');

  const primeiroId = String(novos[0].id);
  const segundoId = String(novos[1].id);
  const parcial = vm.runInContext(`demoRegistrarDevolucao(${JSON.stringify({ itens: [primeiroId], condicao: 'Perfeito', observacoes: 'devolução parcial' })})`, ctx);
  assert.equal(parcial.itens, 1, 'devolução parcial deve atualizar só o item selecionado');
  assert.equal(vm.runInContext(`Boolean(DEMO.emprestimos.find(l => String(l.id) === ${JSON.stringify(primeiroId)}).devolvida)`, ctx), true);
  assert.equal(vm.runInContext(`Boolean(DEMO.emprestimos.find(l => String(l.id) === ${JSON.stringify(segundoId)}).devolvida)`, ctx), false);
  assert.ok(vm.runInContext('demoMovimentacoes().some(m => m.classe === "devolucao" && m.detalhe.includes("devolução parcial"))', ctx), 'movimentação de devolução deve aparecer no histórico');

  // Recria a camada como se a página tivesse sido recarregada.
  ctx = createContext(storage);
  assert.equal(vm.runInContext(`Boolean(DEMO.emprestimos.find(l => String(l.id) === ${JSON.stringify(primeiroId)}).devolvida)`, ctx), true, 'devolução deve persistir após recarga');
  assert.equal(vm.runInContext(`Boolean(DEMO.emprestimos.find(l => String(l.id) === ${JSON.stringify(segundoId)}).devolvida)`, ctx), false, 'item não devolvido deve continuar emprestado após recarga');
  vm.runInContext(`demoRegistrarDevolucao(${JSON.stringify({ itens: [segundoId], condicao: 'Perfeito' })})`, ctx);
  assert.equal(vm.runInContext(`Boolean(DEMO.emprestimos.find(l => String(l.id) === ${JSON.stringify(segundoId)}).devolvida)`, ctx), true, 'devolução final deve fechar o item restante');

  // Falha de armazenamento não pode deixar o empréstimo alterado apenas em memória.
  const antesFalha = vm.runInContext('DEMO.emprestimos.length', ctx);
  storage.failWrites = true;
  assert.throws(() => vm.runInContext(`demoRegistrarEmprestimo(${JSON.stringify({
    solicitante: 'Falha de armazenamento', equipamentos: [idsDisponiveis[0]],
    retirada: retirada.toISOString(), prevista: prevista.toISOString(),
  })})`, ctx), /salvar a operação/, 'falha de persistência deve ser informada');
  assert.equal(vm.runInContext('DEMO.emprestimos.length', ctx), antesFalha, 'falha ao salvar deve desfazer a alteração em memória');
  storage.failWrites = false;

  const novoEquipamento = vm.runInContext(`demoSalvarEquipamento(${JSON.stringify({
    nome: 'Equipamento automatizado', patrimonio: 'AUTO-TEST-01', categoria: 'Outros', setor: 'Validação', condicao: 'Bom', observacoes: 'Registro de teste',
  })}, null)`, ctx);
  assert.equal(novoEquipamento.patrimonio, 'AUTO-TEST-01', 'cadastro de equipamento deve salvar patrimônio normalizado');
  assert.ok(vm.runInContext(`demoEquipamentos().some(e => String(e.id) === ${JSON.stringify(String(novoEquipamento.id))})`, ctx), 'equipamento recém-cadastrado deve aparecer na listagem');
  assert.throws(() => vm.runInContext(`demoSalvarEquipamento(${JSON.stringify({
    nome: 'Duplicado', patrimonio: 'AUTO-TEST-01', categoria: 'Outros', setor: 'Validação', condicao: 'Bom',
  })}, null)`, ctx), /já está cadastrado/, 'patrimônio duplicado deve ser recusado');
  const editado = vm.runInContext(`demoSalvarEquipamento(${JSON.stringify({
    nome: 'Equipamento automatizado editado', patrimonio: 'AUTO-TEST-01', categoria: 'Outros', setor: 'Validação', condicao: 'Regular',
  })}, ${JSON.stringify(String(novoEquipamento.id))})`, ctx);
  assert.equal(editado.nome, 'Equipamento automatizado editado', 'edição de equipamento deve refletir os dados novos');
  const removido = vm.runInContext(`demoRemoverEquipamento(${JSON.stringify(String(novoEquipamento.id))})`, ctx);
  assert.equal(removido.removido, true, 'equipamento sem histórico pode ser removido da lista local');
  assert.equal(vm.runInContext(`demoEquipamentos().some(e => String(e.id) === ${JSON.stringify(String(novoEquipamento.id))})`, ctx), false, 'remoção local deve atualizar a listagem');

  storage.failWrites = true;
  assert.throws(() => vm.runInContext(`demoSalvarEquipamento(${JSON.stringify({
    nome: 'Falha de armazenamento', patrimonio: 'AUTO-FAIL-01', categoria: 'Outros', setor: 'Validação', condicao: 'Bom',
  })}, null)`, ctx), /Não foi possível salvar o cadastro/, 'falha ao persistir equipamento deve ser informada');
  assert.equal(vm.runInContext('DEMO.equipamentos.some(e => e.patrimonio === "AUTO-FAIL-01")', ctx), false, 'falha ao salvar equipamento deve reverter a memória');
  storage.failWrites = false;

  const equipamentoComHistorico = '7';
  const historicoAntesDaRetirada = vm.runInContext(`demoEmprestimos().filter(l => String(l.equipamento.id) === ${JSON.stringify(equipamentoComHistorico)}).length`, ctx);
  assert.ok(historicoAntesDaRetirada > 0, 'o equipamento escolhido deve ter histórico');
  storage.failWrites = true;
  assert.throws(() => vm.runInContext(`demoRemoverEquipamento(${JSON.stringify(equipamentoComHistorico)})`, ctx), /Não foi possível atualizar o cadastro/, 'falha de persistência deve impedir a retirada parcial');
  assert.equal(vm.runInContext(`demoEquipamentos().find(e => String(e.id) === ${JSON.stringify(equipamentoComHistorico)}).situacao`, ctx), 'disponivel', 'falha de persistência deve reverter a retirada');
  storage.failWrites = false;
  const retiradaBem = vm.runInContext(`demoRemoverEquipamento(${JSON.stringify(equipamentoComHistorico)})`, ctx);
  assert.equal(retiradaBem.arquivado, true, 'equipamento com histórico deve ser arquivado, não apagado');
  assert.equal(vm.runInContext(`demoEquipamentos().find(e => String(e.id) === ${JSON.stringify(equipamentoComHistorico)}).situacao`, ctx), 'inativo', 'equipamento retirado deve ficar inativo');
  assert.equal(vm.runInContext(`demoEmprestimos().filter(l => String(l.equipamento.id) === ${JSON.stringify(equipamentoComHistorico)}).length`, ctx), historicoAntesDaRetirada, 'histórico de equipamentos retirados deve ser preservado');
  ctx = createContext(storage);
  assert.equal(vm.runInContext(`demoEquipamentos().find(e => String(e.id) === ${JSON.stringify(equipamentoComHistorico)}).situacao`, ctx), 'inativo', 'retirada de uso deve persistir após recarga');
  assert.equal(vm.runInContext(`demoEmprestimos().filter(l => String(l.equipamento.id) === ${JSON.stringify(equipamentoComHistorico)}).length`, ctx), historicoAntesDaRetirada, 'histórico deve sobreviver à recarga após retirada');

  console.log('PASS: consulta QR por patrimônio e URL');
  console.log('PASS: cadastro, edição, exclusividade de patrimônio e remoção de equipamento');
  console.log('PASS: empréstimo de múltiplos itens e bloqueio de duplicidade/indisponibilidade');
  console.log('PASS: devolução parcial/final e histórico de movimentações');
  console.log('PASS: persistência local após recriação da camada');
  console.log('PASS: rollback quando a persistência local falha');
  console.log('PASS: retirada segura de equipamento com histórico preservado e persistente');
})().catch((error) => { console.error(error); process.exitCode = 1; });
