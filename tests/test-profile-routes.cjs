const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(__dirname, '../frontend/assets/js/layout.js'), 'utf8');
function store() {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
}
function makeElement() {
  const classes = new Set();
  return {
    innerHTML: '', hidden: false, style: {}, dataset: {}, textContent: '', href: '',
    classList: { toggle(name, force) { if (force === undefined ? !classes.has(name) : force) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); } },
    addEventListener() {}, setAttribute() {}, appendChild() {}, remove() {}, focus() {},
  };
}
function runGuard({ session, pathName, page }) {
  const sessionStorage = store();
  const localStorage = store();
  const navigation = { destination: null };
  const nodes = new Map();
  const document = {
    body: { dataset: { pagina: page }, appendChild() {} },
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, makeElement()); return nodes.get(id); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return makeElement(); },
    addEventListener() {},
  };
  const context = {
    obterSessao: () => session,
    sair() {}, sessionStorage, localStorage,
    window: { location: { pathname: pathName, search: '', replace(url) { navigation.destination = url; } } },
    document,
    Set, String, Date, Math, JSON,
  };
  vm.runInNewContext(source, context, { filename: 'layout.js' });
  return navigation.destination;
}
const scenarios = [
  { name: 'aluno é redirecionado ao tentar abrir Usuários', session: { perfil: 'aluno', nome: 'Discente' }, pathName: '/pages/usuarios.html', page: 'usuarios', expected: 'dashboard.html' },
  { name: 'professor pode abrir Devoluções', session: { perfil: 'professor', nome: 'Docente' }, pathName: '/pages/devolucoes.html', page: 'devolucoes', expected: null },
  { name: 'discente pode abrir Novo empréstimo', session: { perfil: 'aluno', nome: 'Discente' }, pathName: '/pages/novo-emprestimo.html', page: 'emprestimos', expected: null },
  { name: 'servidor é perfil de usuário comum e pode devolver', session: { perfil: 'servidor', nome: 'Servidor' }, pathName: '/pages/devolucoes.html', page: 'devolucoes', expected: null },
  { name: 'discente pode consultar o catálogo de itens disponíveis', session: { perfil: 'aluno', nome: 'Discente' }, pathName: '/pages/disponiveis.html', page: 'disponiveis', expected: null },
  { name: 'docente pode consultar o catálogo de itens disponíveis', session: { perfil: 'professor', nome: 'Docente' }, pathName: '/pages/disponiveis.html', page: 'disponiveis', expected: null },
  { name: 'discente pode abrir a consulta por QR Code', session: { perfil: 'aluno', nome: 'Discente' }, pathName: '/pages/consulta-qr-interno.html', page: 'consulta-qr', expected: null },
  { name: 'servidor pode abrir a consulta por QR Code', session: { perfil: 'servidor', nome: 'Servidor' }, pathName: '/pages/consulta-qr-interno.html', page: 'consulta-qr', expected: null },
  { name: 'perfil desconhecido é redirecionado ao login', session: { perfil: 'visitante' }, pathName: '/pages/usuarios.html', page: 'usuarios', expected: '../index.html' },
  { name: 'sem sessão é redirecionado ao login', session: null, pathName: '/pages/devolucoes.html', page: 'devolucoes', expected: '../index.html' },
  { name: 'aluno não acessa Administração por URL direta', session: { perfil: 'aluno', nome: 'Discente' }, pathName: '/pages/relatorio.html', page: 'relatorio', expected: 'dashboard.html' },
];
for (const scenario of scenarios) {
  assert.equal(runGuard(scenario), scenario.expected);
  console.log(`PASS: ${scenario.name}`);
}
