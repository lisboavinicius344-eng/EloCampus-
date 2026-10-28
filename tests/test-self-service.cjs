const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, 'fixtures/dados-demo.js'), 'utf8');
function storage() {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
}
function context(session) {
  const ctx = { localStorage: storage(), URL, Date, Map, Set, Math, Number, String, Boolean, Object, Array, JSON, Error, Promise, encodeURIComponent, decodeURIComponent, obterSessao: () => session };
  vm.createContext(ctx); vm.runInContext(source, ctx, { filename: 'dados-demo.js' }); return ctx;
}
function scenario() {
  const sess = { nome: 'Pessoa Teste', perfil: 'aluno', matricula: 'T-001' };
  const ctx = context(sess);
  const ids = vm.runInContext('demoEquipamentos().filter(e => e.situacao === "disponivel").slice(0, 2).map(e => e.id)', ctx);
  const retirada = new Date(); const prevista = new Date(retirada.getTime() + 86400000);
  const loan = vm.runInContext(`demoRegistrarEmprestimo(${JSON.stringify({ solicitante: 'Pessoa Teste', vinculo: 'Aluno', matricula: 'T-001', equipamentos: [ids[0]], retirada: retirada.toISOString(), prevista: prevista.toISOString(), finalidade: 'Teste' })})`, ctx);
  assert.equal(loan.itens, 1, 'usuário comum pode solicitar equipamento em nome próprio');
  assert.throws(() => vm.runInContext(`demoRegistrarEmprestimo(${JSON.stringify({ solicitante: 'Outra Pessoa', equipamentos: [ids[1]], retirada: retirada.toISOString(), prevista: prevista.toISOString() })})`, ctx), /próprio nome/, 'usuário comum não pode registrar pedido em nome de outra pessoa');
  const created = vm.runInContext('DEMO.emprestimos.find(l => l.emprestimoId === ' + loan.id + ')', ctx);
  const emprestimoOutraPessoa = vm.runInContext('DEMO.emprestimos.find(l => l.id === 1)', ctx);
  assert.throws(() => vm.runInContext(`demoRegistrarDevolucao(${JSON.stringify({ itens: [String(emprestimoOutraPessoa.id)], condicao: 'Perfeito' })})`, ctx), /vinculados ao seu cadastro/, 'usuário comum não pode devolver item de outra pessoa');
  const returned = vm.runInContext(`demoRegistrarDevolucao(${JSON.stringify({ itens: [String(created.id)], condicao: 'Perfeito' })})`, ctx);
  assert.equal(returned.itens, 1, 'usuário comum pode devolver item do próprio cadastro');
  console.log('PASS: usuário comum consegue solicitar e devolver os próprios equipamentos; operações em nome de terceiros são rejeitadas');
}
scenario();
