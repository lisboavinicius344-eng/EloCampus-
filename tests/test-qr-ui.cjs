const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/qr.js'), 'utf8');
class Element {
  constructor(id = '') { this.id = id; this.value = ''; this.textContent = ''; this.className = ''; this.hidden = false; this.disabled = false; this.files = []; this.listeners = {}; this._innerHTML = ''; this.children = {}; this.classList = { add: (...names) => { this.className = [...new Set((this.className + ' ' + names.join(' ')).trim().split(/\s+/))].join(' '); }, remove: (...names) => { this.className = this.className.split(/\s+/).filter(n => n && !names.includes(n)).join(' '); } }; this.videoWidth = 0; this.videoHeight = 0; this.readyState = 0; this.srcObject = null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  async dispatch(type, event = {}) { let last; for (const fn of this.listeners[type] || []) last = await fn({ preventDefault() {}, ...event }); return last; }
  requestSubmit() { return this.dispatch('submit'); }
  replaceChildren() { this._innerHTML = ''; this.children = {}; }
  set innerHTML(value) { this._innerHTML = String(value); if (this._innerHTML.includes('data-qr-history')) this.children['[data-qr-history]'] = new Element('history'); }
  get innerHTML() { return this._innerHTML; }
  querySelector(selector) { return this.children[selector] || null; }
  play() { return Promise.resolve(); }
}
async function run({ payload, session = null, history = [] }) {
  const ids = ['qr-video','qr-reader','qr-reader-hint','abrir-camera','qr-arquivo','consulta-form','codigo','consultar-btn','consulta-status','resultado','qr-permission'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element(id)]));
  const calls = { qr: 0, history: 0 };
  const ELO = { consultaQr: async () => { calls.qr++; return payload; }, movimentacoes: async () => { calls.history++; return history; } };
  const context = {
    document: { getElementById: id => nodes[id] || null, createElement: () => new Element('canvas') },
    window: { addEventListener() {}, location: { search: '' } }, location: { search: '' }, URLSearchParams, URL,
    ELO, obterSessao: session ? () => session : undefined, navigator: {}, setTimeout, clearTimeout, console,
  };
  vm.createContext(context); vm.runInContext(source, context, { filename: 'qr.js' });
  nodes.codigo.value = 'PRJ-0017';
  await nodes['consulta-form'].dispatch('submit');
  await new Promise(resolve => setImmediate(resolve));
  return { nodes, calls };
}
(async () => {
  const item = { id: 2, nome: 'Projetor Epson X49', numero_patrimonio: 'PRJ-0017', categoria: 'Projeção', setor: 'Audiovisual', localizacao: 'Sala 12', estado_conservacao: 'bom', status: 'emprestado', situacao: 'atrasado', qr_code: 'QR-PRJ-0017', elegibilidade: 'todos', observacoes: 'Acompanha controle remoto', criado_em: '2026-10-01T12:00:00+00:00' };
  const equipe = await run({
    payload: { equipamento: item, emprestimo: { id: 4, solicitante: 'Pessoa Teste', data_emprestimo: '2026-10-20T13:20:00+00:00', data_prevista_devolucao: '2026-10-23T21:00:00+00:00', atrasado: true } },
    session: { token: 'TOKEN', perfil: 'administrador' },
    history: [{ id: 1, equipamento: { id: 2 }, tipo: 'emprestimo', quando: '2026-10-20T13:20:00+00:00', detalhe: 'Equipamento emprestado.', por: 'Operador' }],
  });
  const output = equipe.nodes.resultado.innerHTML;
  for (const value of ['Projetor Epson X49', 'PRJ-0017', 'Projeção', 'Audiovisual', 'Sala 12', 'Acompanha controle remoto', 'Empréstimo atual', 'Pessoa Teste', 'Devolução prevista', 'Movimentações recentes']) assert.ok(output.includes(value), `resultado deve mostrar: ${value}`);
  assert.ok(equipe.nodes.resultado.children['[data-qr-history]']?.innerHTML.includes('Equipamento emprestado.'), 'o histórico deve aparecer dentro do painel de movimentações');
  assert.equal(equipe.calls.history, 1, 'equipe autenticada deve consultar histórico');

  const publico = await run({ payload: { equipamento: item, emprestimo: null } });
  const publicOutput = publico.nodes.resultado.innerHTML;
  assert.ok(publicOutput.includes('O equipamento está emprestado'));
  assert.ok(publicOutput.includes('Por privacidade'));
  assert.ok(!publicOutput.includes('Pessoa Teste'), 'público não deve receber detalhes de quem retirou');
  assert.equal(publico.calls.history, 0, 'consulta pública não deve solicitar o histórico privado');
  console.log('PASS: QR exibe categoria, patrimônio, estado, localização, conservação e observações retornadas pela API');
  console.log('PASS: equipe autenticada vê empréstimo atual e movimentações anteriores permitidas');
  console.log('PASS: consulta pública informa estado de empréstimo sem revelar dados pessoais');
})().catch(error => { console.error(error); process.exitCode = 1; });
